/**
 * ============================================================
 *  MARTINSH WATER SHADER — PORT THREE.JS / R3F / TYPESCRIPT
 * ============================================================
 *
 * Basé sur le travail de Martins Upitis (2013)
 * devlog-martinsh.blogspot.com
 *
 * DÉCOMPOSITION DES TECHNIQUES :
 * ─────────────────────────────────────────────────────────────
 *  1. SURFACE (vertex) : Projected Grid + déplacement per-vertex
 *     → Gerstner Waves pour simuler la propagation des vagues
 *
 *  2. NORMALES : Double normal-map animée (scrolling en temps)
 *     → fbm (fractal Brownian motion) pour casser la répétition
 *
 *  3. FRESNEL : Modèle Schlick — angle caméra/surface
 *     → faible angle → beaucoup de réflexion
 *     → angle rasant → beaucoup de réfraction
 *
 *  4. RÉFLEXION : Planar Reflection via RenderTarget
 *     → caméra miroir en dessous du plan d'eau
 *     → distorsion par les normales
 *
 *  5. RÉFRACTION : Echantillonnage du fond avec aberration chromatique
 *     → décalage RVB séparé selon angle de réfraction
 *
 *  6. CAUSTIQUES : Texture animée projetée sur le fond
 *     → double-sample avec décalage temporel opposé
 *     → min(r1, g2, b3) pour l'effet "veines de lumière"
 *
 *  7. SCATTERING SOUS-MARIN : Extinction volumétrique
 *     → Beer-Lambert : exp(-depth * extinctionCoeff * waterColor)
 *     → sépare les composantes R,G,B (l'eau absorbe le rouge en premier)
 *
 *  8. TRANSITION EAU/SOUS-L'EAU : basculement selon position caméra
 *     → même shader, uniforme `uCameraIsUnderwater`
 *
 *  9. CIEL / PREETHAM : modèle de ciel analytique simplifié
 *     → même paramètre soleil contrôle ciel + teinte eau
 * ─────────────────────────────────────────────────────────────
 */

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
//  VERTEX SHADER
//  Rôle : déformer la surface plane en vagues
// ─────────────────────────────────────────────────────────────
const waterVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2  uWindDir;    // direction du vent (normalised)
  uniform float uWaveSpeed;
  uniform float uWaveHeight;

  varying vec3  vWorldPos;
  varying vec3  vViewDir;
  varying vec2  vUv;

  // ── Gerstner Wave ─────────────────────────────────────────
  // Simule des vagues physiquement plausibles (trochoïdes)
  // Q  : "steepness" 0..1 (0 = sinusoïdal, 1 = trochoïde)
  // A  : amplitude
  // w  : fréquence angulaire (2π / longueur d'onde)
  // phi: vitesse de phase (speed * 2π / longueur d'onde)
  // D  : direction 2D normalisée
  vec3 gerstnerWave(vec2 pos, float Q, float A, float w, float phi, vec2 D) {
    float dotDP = dot(D, pos);
    float s = sin(dotDP * w + uTime * phi);
    float c = cos(dotDP * w + uTime * phi);
    return vec3(
      Q * A * D.x * c,   // déplacement X
      A * s,             // déplacement Y (hauteur)
      Q * A * D.y * c    // déplacement Z
    );
  }

  void main() {
    vec3 pos = position;
    vUv = uv;

    // Superposition de 4 vagues Gerstner avec params différents
    // (Martinsh en utilisait plus, ici 4 pour la lisibilité)
    vec2 d1 = normalize(uWindDir);
    vec2 d2 = normalize(uWindDir + vec2(0.2, -0.1));
    vec2 d3 = normalize(uWindDir + vec2(-0.3, 0.15));
    vec2 d4 = normalize(vec2(-uWindDir.y, uWindDir.x));

    vec3 disp  = gerstnerWave(pos.xz, 0.5, uWaveHeight * 1.0, 0.8, uWaveSpeed * 1.0,  d1);
         disp += gerstnerWave(pos.xz, 0.4, uWaveHeight * 0.7, 1.3, uWaveSpeed * 0.9,  d2);
         disp += gerstnerWave(pos.xz, 0.3, uWaveHeight * 0.5, 2.1, uWaveSpeed * 1.2,  d3);
         disp += gerstnerWave(pos.xz, 0.2, uWaveHeight * 0.3, 3.5, uWaveSpeed * 0.7,  d4);

    pos += disp;

    vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos4.xyz;
    vViewDir  = cameraPosition - vWorldPos;

    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`;

// ─────────────────────────────────────────────────────────────
//  FRAGMENT SHADER
//  Rôle : calculer la couleur finale de chaque pixel de la surface
// ─────────────────────────────────────────────────────────────
const waterFragmentShader = /* glsl */ `
  precision highp float;

  // ── Textures ───────────────────────────────────────────────
  uniform sampler2D uNormalMap;       // normal map (eau)
  uniform sampler2D uCausticsTex;     // texture de caustiques
  uniform sampler2D uReflectionTex;   // RenderTarget réflexion
  uniform sampler2D uRefractionTex;   // RenderTarget réfraction
  uniform sampler2D uDepthTex;        // profondeur scène fond

  // ── Paramètres temporels & géométriques ───────────────────
  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uWaterLevel;          // hauteur Y du plan d'eau

  // ── Propriétés optiques de l'eau ──────────────────────────
  uniform vec3  uWaterColor;          // couleur de base
  uniform float uWaterClarity;        // 0=opaque, 1=limpide
  uniform vec3  uExtinctionColor;     // couleur d'extinction (Beer-Lambert)
  uniform float uFresnelBias;         // biais fresnel (0..1)
  uniform float uFresnelScale;        // échelle
  uniform float uFresnelPower;        // puissance (5.0 = eau réelle)

  // ── Soleil ─────────────────────────────────────────────────
  uniform vec3  uSunDir;              // direction normalisée vers le soleil
  uniform vec3  uSunColor;            // couleur/intensité soleil
  uniform float uSunGlare;            // intensité du glare solaire

  // ── Etat caméra ────────────────────────────────────────────
  uniform bool  uCameraIsUnderwater;
  uniform float uNear;
  uniform float uFar;

  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying vec2 vUv;

  // ── Helpers ────────────────────────────────────────────────

  // Reconstruction de la profondeur depuis un depth buffer
  float linearizeDepth(float d) {
    return (2.0 * uNear) / (uFar + uNear - d * (uFar - uNear));
  }

  // ── Normal map animée (2 couches scrollant en sens contraire)
  // Martinsh : la subtilité est d'utiliser 2 échelles + 2 temps
  // Ce double-sampling "casse" visuellement la répétition
  vec3 waterNormal(vec2 uv) {
    float t  = uTime * 0.05;
    vec2 uv1 = uv * 3.0  + vec2( t * 0.7,  t * 0.5);
    vec2 uv2 = uv * 7.0  + vec2(-t * 0.4,  t * 0.9);
    vec2 uv3 = uv * 15.0 + vec2( t * 0.3, -t * 0.6);

    // On pondère les couches : basse fréquence domine
    vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
    vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;

    return normalize(n1 * 0.5 + n2 * 0.3 + n3 * 0.2);
  }

  // ── Fresnel Schlick ────────────────────────────────────────
  // R(θ) = R0 + (1 - R0)(1 - cosθ)^5
  // R0 ≈ ((n1-n2)/(n1+n2))² = 0.02 pour eau/air
  // Martinsh ajoute bias+scale pour contrôle artistique
  float fresnel(vec3 viewDir, vec3 normal) {
    float cosTheta = clamp(dot(normalize(viewDir), normal), 0.0, 1.0);
    return uFresnelBias + uFresnelScale * pow(1.0 - cosTheta, uFresnelPower);
  }

  // ── Caustiques (Martinsh) ──────────────────────────────────
  // Technique : 2 samples décalés dans le temps + séparation RGB
  // Chaque canal couleur arrive du "même endroit" mais à des moments
  // légèrement différents → imite la dispersion spectrale de la lumière
  vec3 caustics(vec2 uv, float depth) {
    float t    = uTime * 0.1;
    float scale = 2.0;

    // Sample A : UV normal
    vec2 uvA = uv * scale + vec2(t * 0.7, t * 0.3);
    // Sample B : UV décalé + inversé temporellement
    vec2 uvB = uv * scale * 1.23 + vec2(-t * 0.5, t * 0.8);

    // Séparation des canaux — l'eau réfracte le rouge moins que le bleu
    // (aberration chromatique sous-marine)
    float r = min(texture2D(uCausticsTex, uvA).r,
                  texture2D(uCausticsTex, uvB).r);
    float g = min(texture2D(uCausticsTex, uvA + 0.01).g,
                  texture2D(uCausticsTex, uvB + 0.01).g);
    float b = min(texture2D(uCausticsTex, uvA + 0.02).b,
                  texture2D(uCausticsTex, uvB + 0.02).b);

    // Modulation par la profondeur : les caustiques s'estompent en profondeur
    float depthFade = exp(-depth * 0.5);
    return vec3(r, g, b) * depthFade * 3.0;
  }

  // ── Extinction volumétrique Beer-Lambert ───────────────────
  // La lumière perd de l'énergie exponentiellement avec la profondeur
  // Chaque canal (R,G,B) a son propre coefficient d'absorption
  // (l'eau absorbe le rouge très vite → tout devient bleu/vert en profondeur)
  vec3 extinctionFactor(float depth) {
    vec3 extCoeff = vec3(0.45, 0.15, 0.06); // rouge absorbé 7x plus vite que bleu
    return exp(-depth * extCoeff * (1.0 / uWaterClarity));
  }

  // ── Scattering de la lumière (SSS simplifié) ───────────────
  // Martinsh simule la diffusion lumineuse dans l'eau
  // par un terme Mie simplifié orienté vers le soleil
  float scattering(vec3 viewDir, vec3 sunDir, float depth) {
    float vdots = max(0.0, dot(-normalize(viewDir), sunDir));
    float mie   = 0.5 * (1.0 + vdots * vdots); // phase Mie simplifiée
    return mie * exp(-depth * 0.3) * 0.3;
  }

  // ── Glare solaire sur l'eau ────────────────────────────────
  // Spéculaire blinn-phong très concentré
  float sunGlare(vec3 normal, vec3 viewDir, vec3 sunDir) {
    vec3  halfV   = normalize(normalize(viewDir) + sunDir);
    float spec    = pow(max(0.0, dot(normal, halfV)), 512.0);
    return spec * uSunGlare;
  }

  void main() {
    // ── Vecteur vue normalisé
    vec3 viewDir = normalize(vViewDir);

    // ── Normal map animée (en espace monde)
    vec3 N = waterNormal(vUv);
    // On garde la normale principalement verticale (eau pas trop agitée)
    N = normalize(vec3(N.x * 0.3, 1.0, N.z * 0.3));

    // ── Coordonnées écran (pour sample les render targets)
    vec2 screenUV = gl_FragCoord.xy / uResolution;

    // ── Distorsion UV pour réflexion/réfraction
    // La normale perturbe les UV de sampling → illusion de réfraction
    vec2 distort = N.xz * 0.05;

    // ── RÉFLEXION ─────────────────────────────────────────────
    vec2  reflUV  = vec2(screenUV.x, 1.0 - screenUV.y) + distort;
    vec3  reflCol = texture2D(uReflectionTex, clamp(reflUV, 0.001, 0.999)).rgb;

    // ── RÉFRACTION avec aberration chromatique ─────────────────
    // Martinsh : décale chaque canal différemment pour imiter
    // la dispersion de Snell selon la longueur d'onde
    float aberr = 0.003;
    vec3 refrCol;
    refrCol.r = texture2D(uRefractionTex, screenUV + distort * 1.0 - aberr).r;
    refrCol.g = texture2D(uRefractionTex, screenUV + distort * 1.0        ).g;
    refrCol.b = texture2D(uRefractionTex, screenUV + distort * 1.0 + aberr).b;

    // ── PROFONDEUR du fond sous le pixel courant
    float rawDepth   = texture2D(uDepthTex, screenUV).r;
    float sceneDepth = linearizeDepth(rawDepth) * (uFar - uNear);
    float waterDepth = max(0.0, sceneDepth);

    // ── EXTINCTION (Beer-Lambert)
    vec3 extFactor = extinctionFactor(waterDepth);
    // Le fond "teinte" avec la couleur de l'eau en profondeur
    refrCol = mix(uWaterColor * 0.5, refrCol, extFactor);

    // ── CAUSTIQUES sur le fond
    vec3 causticCol = caustics(vUv, waterDepth);
    refrCol += causticCol * extFactor * (1.0 - extFactor.r); // seulement dans les eaux peu profondes

    // ── SCATTERING
    float scatter  = scattering(viewDir, uSunDir, waterDepth);
    vec3  scatCol  = uWaterColor * scatter * uSunColor;

    // ── FRESNEL (mélange réflexion ↔ réfraction)
    float fresnelFactor = fresnel(viewDir, N);
    fresnelFactor = clamp(fresnelFactor, 0.0, 1.0);

    // ── GLARE SOLAIRE (s'ajoute par-dessus)
    float glare = sunGlare(N, viewDir, uSunDir);

    // ── ASSEMBLAGE FINAL ──────────────────────────────────────
    // Le mix fresnel est LA clé : il donne l'aspect "miroir à angle rasant"
    vec3 waterSurface = mix(refrCol, reflCol, fresnelFactor);
    waterSurface += scatCol;
    waterSurface += uSunColor * glare;

    // ── MODE SOUS-MARIN ────────────────────────────────────────
    // Martinsh : quand la caméra est sous l'eau, on inverse le calcul
    // On voit le fond (réfraction) avec teinte bleue + caustics du dessus
    if (uCameraIsUnderwater) {
      vec3 underwaterTint = uWaterColor * 0.8;
      float fogAmount     = 1.0 - exp(-waterDepth * 0.15);
      waterSurface = mix(waterSurface, underwaterTint, fogAmount * 0.7);
      waterSurface += causticCol * 0.5;
    }

    // ── Tonemapping minimal (réel : utiliser post-processing)
    waterSurface = waterSurface / (waterSurface + 1.0); // Reinhard
    waterSurface = pow(waterSurface, vec3(1.0 / 2.2));  // gamma

    gl_FragColor = vec4(waterSurface, 0.95);
  }
`;

// ─────────────────────────────────────────────────────────────
//  COMPOSANT WATER MESH
// ─────────────────────────────────────────────────────────────
interface WaterProps {
    size?: number;
    resolution?: number;
}

function Water({ size = 40, resolution = 128 }: WaterProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const { gl, scene, camera, size: canvasSize } = useThree();

    // ── RenderTarget pour la réflexion planar ─────────────────
    // Principe : on rend la scène depuis une caméra miroir (en-dessous du plan)
    const reflectionTarget = useMemo(
        () =>
            new THREE.WebGLRenderTarget(canvasSize.width / 2, canvasSize.height / 2, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
            }),
        [canvasSize.width, canvasSize.height]
    );

    // ── RenderTarget pour la réfraction ───────────────────────
    const refractionTarget = useMemo(
        () =>
            new THREE.WebGLRenderTarget(canvasSize.width / 2, canvasSize.height / 2, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                depthBuffer: true,
                depthTexture: new THREE.DepthTexture(
                    canvasSize.width / 2,
                    canvasSize.height / 2
                ),
            }),
        [canvasSize.width, canvasSize.height]
    );

    // ── Caméra miroir pour la réflexion ───────────────────────
    const reflCamera = useMemo(() => {
        const cam = camera.clone() as THREE.PerspectiveCamera;
        return cam;
    }, [camera]);

    // ── Normal map procédurale (fallback si pas de texture) ───
    const normalMap = useMemo(() => {
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            const x = (i % size) / size;
            const y = Math.floor(i / size) / size;
            // FBM simplifié pour générer une normal map watery
            const freq1 = 8.0;
            const freq2 = 17.0;
            const freq3 = 31.0;
            const nx =
                Math.sin(x * freq1 * Math.PI * 2) * 0.5 +
                Math.sin(x * freq2 * Math.PI * 2 + y * 5.0) * 0.3 +
                Math.sin(y * freq3 * Math.PI * 2) * 0.2;
            const ny =
                Math.cos(y * freq1 * Math.PI * 2) * 0.5 +
                Math.cos(y * freq2 * Math.PI * 2 + x * 5.0) * 0.3 +
                Math.cos(x * freq3 * Math.PI * 2) * 0.2;
            data[i * 4 + 0] = Math.floor((nx * 0.5 + 0.5) * 255); // R = normalX
            data[i * 4 + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // G = normalY
            data[i * 4 + 2] = 255; // B = normalZ (vers le haut)
            data[i * 4 + 3] = 255;
        }
        const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        return tex;
    }, []);

    // ── Texture de caustiques procédurale ─────────────────────
    const causticsTex = useMemo(() => {
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            const x = (i % size) / size;
            const y = Math.floor(i / size) / size;
            // Voronoï simplifié pour les caustiques
            let minDist = 1.0;
            for (let j = 0; j < 8; j++) {
                const cx = (Math.sin(j * 2.399) * 0.5 + 0.5);
                const cy = (Math.cos(j * 3.141) * 0.5 + 0.5);
                const dx = x - cx;
                const dy = y - cy;
                minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
            }
            const v = Math.floor(Math.pow(1.0 - minDist * 2.0, 3.0) * 255);
            const bright = Math.max(0, v);
            data[i * 4 + 0] = bright;
            data[i * 4 + 1] = bright;
            data[i * 4 + 2] = bright;
            data[i * 4 + 3] = 255;
        }
        const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        return tex;
    }, []);

    // ── Uniforms ───────────────────────────────────────────────
    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(canvasSize.width, canvasSize.height) },
            uWindDir: { value: new THREE.Vector2(1.0, 0.5) },
            uWaveSpeed: { value: 0.8 },
            uWaveHeight: { value: 0.15 },
            uWaterLevel: { value: 0.0 },
            uWaterColor: { value: new THREE.Color(0.04, 0.27, 0.35) },
            uWaterClarity: { value: 0.6 },
            uExtinctionColor: { value: new THREE.Color(0.45, 0.15, 0.06) },
            uFresnelBias: { value: 0.02 },   // R0 physique ≈ 0.02 pour eau
            uFresnelScale: { value: 0.98 },
            uFresnelPower: { value: 5.0 },    // 5.0 = loi de Schlick exacte
            uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
            uSunColor: { value: new THREE.Color(1.0, 0.95, 0.8) },
            uSunGlare: { value: 3.0 },
            uCameraIsUnderwater: { value: false },
            uNear: { value: 0.1 },
            uFar: { value: 100.0 },
            uNormalMap: { value: normalMap },
            uCausticsTex: { value: causticsTex },
            uReflectionTex: { value: reflectionTarget.texture },
            uRefractionTex: { value: refractionTarget.texture },
            uDepthTex: { value: refractionTarget.depthTexture },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    // ── Loop ───────────────────────────────────────────────────
    useFrame(({ clock, camera: cam }) => {
        const t = clock.getElapsedTime();
        uniforms.uTime.value = t;
        uniforms.uResolution.value.set(canvasSize.width, canvasSize.height);
        uniforms.uNear.value = (cam as THREE.PerspectiveCamera).near;
        uniforms.uFar.value = (cam as THREE.PerspectiveCamera).far;

        // Détection caméra sous l'eau
        uniforms.uCameraIsUnderwater.value = cam.position.y < 0.0;

        // ── Render réfraction : scène entière sauf la surface d'eau
        if (meshRef.current) meshRef.current.visible = false;
        gl.setRenderTarget(refractionTarget);
        gl.render(scene, cam);

        // ── Render réflexion : caméra miroir (sous le plan d'eau)
        // On copie la caméra courante et on "renverse" la position Y
        const waterY = 0.0;
        reflCamera.copy(cam);
        reflCamera.position.y = 2 * waterY - cam.position.y;
        reflCamera.rotation.x = -cam.rotation.x;
        reflCamera.updateMatrixWorld();

        gl.setRenderTarget(reflectionTarget);
        gl.render(scene, reflCamera);

        gl.setRenderTarget(null);
        if (meshRef.current) meshRef.current.visible = true;
    });

    // Cleanup
    useEffect(() => {
        return () => {
            reflectionTarget.dispose();
            refractionTarget.dispose();
        };
    }, [reflectionTarget, refractionTarget]);

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[size, size, resolution, resolution]} />
            <shaderMaterial
                vertexShader={waterVertexShader}
                fragmentShader={waterFragmentShader}
                uniforms={uniforms}
                transparent
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// ─────────────────────────────────────────────────────────────
//  SCÈNE DE DÉMONSTRATION
// ─────────────────────────────────────────────────────────────
function Scene() {
    return (
        <>
            {/* Fond marin */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
                <planeGeometry args={[60, 60, 1, 1]} />
                <meshStandardMaterial color="#4a7c59" roughness={0.9} />
            </mesh>

            {/* Quelques rochers */}
            {[
                [-5, -3.5, -8], [7, -3.8, -5], [-10, -3.2, 3],
                [3, -3.6, 10], [-3, -3.4, -3],
            ].map(([x, y, z], i) => (
                <mesh key={i} position={[x as number, y as number, z as number]}>
                    <dodecahedronGeometry args={[0.8 + (i % 3) * 0.3, 0]} />
                    <meshStandardMaterial color="#556655" roughness={0.8} />
                </mesh>
            ))}

            {/* Surface d'eau */}
            <Water size={50} resolution={96} />

            {/* Lumière ambiante */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 15, 8]}
                intensity={1.5}
                color="#fff5e0"
                castShadow
            />

            {/* Ciel (skybox simple) */}
            <mesh>
                <sphereGeometry args={[80, 32, 16]} />
                <meshBasicMaterial
                    color="#87CEEB"
                    side={THREE.BackSide}
                />
            </mesh>
        </>
    );
}

// ─────────────────────────────────────────────────────────────
//  EXPORT PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function WaterShaderDemo() {
    return (
        <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
            <Canvas
                camera={{ position: [0, 5, 15], fov: 60, near: 0.1, far: 200 }}
                gl={{ antialias: true }}
            >
                <Scene />
                <OrbitControls
                    target={[0, 0, 0]}
                    minDistance={2}
                    maxDistance={50}
                />
            </Canvas>

            {/* Overlay d'info */}
            <div style={{
                position: "absolute", top: 16, left: 16,
                color: "white", fontFamily: "monospace", fontSize: 12,
                background: "rgba(0,0,0,0.5)", padding: "8px 12px", borderRadius: 6,
                lineHeight: 1.7, maxWidth: 320,
            }}>
                <strong>Martinsh Water Shader — R3F Port</strong><br />
                Techniques actives :<br />
                • Gerstner Waves (vertex)<br />
                • Normal map FBM 3-couches<br />
                • Fresnel Schlick (R0=0.02)<br />
                • Réflexion planaire (RenderTarget)<br />
                • Réfraction + aberration chromatique<br />
                • Caustiques Voronoï double-sample<br />
                • Extinction Beer-Lambert (R,G,B)<br />
                • Scattering Mie simplifié<br />
                • Transition eau/sous-l'eau
            </div>
        </div>
    );
}