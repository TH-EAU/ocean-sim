import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { WaveLayer } from "../types/wave";
import heightmapUrl from "../assets/heightmap.png?url";

const MAX_WAVES = 8;
const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
const DEFAULT_WIND_DIR: [number, number] = [0.8, 0.8];
const EMPTY_WAVES: WaveLayer[] = [];

// ── GLSL snippets ─────────────────────────────────────────────────────────────

// Uniforms, varyings, and helper functions injected before void main()
const VERT_PREAMBLE = /* glsl */ `
uniform float uTime;
uniform vec2  uWaveDirections[${MAX_WAVES}];
uniform float uWaveAmplitudes[${MAX_WAVES}];
uniform float uWaveSteepnesses[${MAX_WAVES}];
uniform float uWaveWavelengths[${MAX_WAVES}];
uniform float uWaveSpeeds[${MAX_WAVES}];
uniform float uWaveWarpStrengths[${MAX_WAVES}];
uniform int   uNumCarrierWaves;
uniform int   uNumSecondaryWaves;
uniform float uModulationStrength;
uniform float uSecondaryNoiseScale;
uniform float uSecondaryNoiseStrength;
uniform float uDetailFBmScale;
uniform float uDetailFBmStrength;
uniform float uDetailFBmSpeed;
uniform vec2  uDetailWindDir;
uniform sampler2D uHeightmap;
uniform vec4  uTerrainBounds;
uniform float uTerrainDamping;

varying vec3  vWorldPos;
varying float vTerrainH;
varying float vSelfShadow;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float valueNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbmDetail(vec2 p) {
    float v = 0.0, a = 0.5, f = 1.0;
    for (int k = 0; k < 3; k++) { v += a * valueNoise(p * f); a *= 0.5; f *= 2.0; }
    return v * 2.0 - 1.0;
}
vec2 warpedXZ(int i, vec2 xz) {
    float ws = uWaveWarpStrengths[i];
    return xz + vec2(sin(xz.y * 0.17 + uTime * 0.031) * ws,
                     sin(xz.x * 0.23 + uTime * 0.024) * ws);
}
`;

// Replaces #include <beginnormal_vertex>
// Full Gerstner computation — declares displaced & worldNormal for subsequent chunks
const VERT_NORMAL = /* glsl */ `
vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
vec2 xz = worldBase.xz;

vec2 hUV = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
float h = texture(uHeightmap, hUV).r;
float ampScale = 1.0 - h * uTerrainDamping;

vec2  envUV             = xz * uSecondaryNoiseScale + vec2(uTime * 0.012, uTime * 0.007);
float secondaryEnvelope = 1.0 - uSecondaryNoiseStrength * (1.0 - valueNoise(envUV));
float warpFreq          = uSecondaryNoiseScale * 0.7;
vec2  noiseWarp2D = vec2(
    valueNoise(xz * warpFreq + vec2(31.4, 92.6) + uTime * 0.008),
    valueNoise(xz * warpFreq + vec2(64.2, 17.8) + uTime * 0.006)) * 2.0 - 1.0;

float carrierY = 0.0, carrierAmpSum = 0.0;
for (int i = 0; i < ${MAX_WAVES}; i++) {
    if (i >= uNumCarrierWaves) break;
    float A = uWaveAmplitudes[i] * ampScale;
    if (A < 0.0001) continue;
    vec2  D   = normalize(uWaveDirections[i]);
    float w   = 6.28318 / uWaveWavelengths[i];
    float spd = sqrt(9.81 / w) * uWaveSpeeds[i];
    carrierY      += A * sin(dot(D, warpedXZ(i, xz)) * w + uTime * spd);
    carrierAmpSum += A;
}
float modFactor = carrierAmpSum > 0.0
    ? max(0.0, 1.0 + uModulationStrength * (carrierY / carrierAmpSum))
    : 1.0;

vec3  displaced = worldBase;
vec3  ddx = vec3(1.0, 0.0, 0.0);
vec3  ddz = vec3(0.0, 0.0, 1.0);
float ampSum = 0.0;

for (int i = 0; i < ${MAX_WAVES}; i++) {
    float A = uWaveAmplitudes[i] * ampScale;
    bool isSecondary = (i >= uNumCarrierWaves) && (i < uNumCarrierWaves + uNumSecondaryWaves);
    if (isSecondary) A *= modFactor * secondaryEnvelope;
    if (A < 0.0001) continue;

    vec2  D   = normalize(uWaveDirections[i]);
    float Q   = uWaveSteepnesses[i];
    float w   = 6.28318 / uWaveWavelengths[i];
    float spd = sqrt(9.81 / w) * uWaveSpeeds[i];
    vec2  xzW = isSecondary ? xz + noiseWarp2D * uWaveWarpStrengths[i] : warpedXZ(i, xz);
    float phase = dot(D, xzW) * w + uTime * spd;
    float sinP = sin(phase), cosP = cos(phase);

    displaced.x += (D.x / w) * A * Q * cosP;
    displaced.z += (D.y / w) * A * Q * cosP;
    displaced.y += A * sinP;
    ampSum      += A;

    ddx.x += -D.x * D.x * A * Q * w * sinP;
    ddx.y +=  D.x * A * w * cosP;
    ddx.z += -D.x * D.y * A * Q * w * sinP;
    ddz.x += -D.x * D.y * A * Q * w * sinP;
    ddz.y +=  D.y * A * w * cosP;
    ddz.z += -D.y * D.y * A * Q * w * sinP;
}

vSelfShadow = ampSum > 0.0 ? clamp(displaced.y / ampSum, -1.0, 1.0) : 0.0;

if (uDetailFBmStrength > 0.0) {
    vec2  detailUV = xz * uDetailFBmScale + uDetailWindDir * uTime * uDetailFBmSpeed;
    displaced.y  += uDetailFBmStrength * fbmDetail(detailUV);
    const float EPS = 0.15;
    vec2 dxUV = vec2(EPS * uDetailFBmScale, 0.0);
    vec2 dzUV = vec2(0.0, EPS * uDetailFBmScale);
    ddx.y += uDetailFBmStrength * (fbmDetail(detailUV + dxUV) - fbmDetail(detailUV - dxUV)) / (2.0 * EPS);
    ddz.y += uDetailFBmStrength * (fbmDetail(detailUV + dzUV) - fbmDetail(detailUV - dzUV)) / (2.0 * EPS);
}

vec3 worldNormal = normalize(cross(ddz, ddx));
vWorldPos = displaced;
vTerrainH = h;
// objectNormal in object space so Three.js normalMatrix pipeline works correctly
vec3 objectNormal = transpose(mat3(modelMatrix)) * worldNormal;
`;

// Replaces #include <defaultnormal_vertex>
// Transforms objectNormal to view-space for Three.js lighting chunks
const VERT_DEFAULT_NORMAL = /* glsl */ `
vec3 transformedNormal = normalize(normalMatrix * objectNormal);
#ifdef FLIP_SIDED
    transformedNormal = -transformedNormal;
#endif
vNormal = transformedNormal;
`;

// Replaces #include <begin_vertex>
// Converts world-space displaced back to object space for Three.js project_vertex
const VERT_BEGIN = /* glsl */ `
vec3 transformed = (inverse(modelMatrix) * vec4(displaced, 1.0)).xyz;
`;

// Fragment varyings — injected before void main()
const FRAG_PREAMBLE = /* glsl */ `
varying vec3  vWorldPos;
varying float vTerrainH;
varying float vSelfShadow;
`;

// Replaces #include <color_fragment> — ocean color based on wave crest/trough
const FRAG_COLOR = /* glsl */ `
vec3 deepColor    = vec3(0.02, 0.10, 0.22);
vec3 shallowColor = vec3(0.08, 0.38, 0.50);
float blend = smoothstep(-0.6, 0.8, vSelfShadow);
diffuseColor.rgb = mix(deepColor, shallowColor, blend);
float foam = smoothstep(0.72, 1.0, vSelfShadow);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.90, 0.95), foam * 0.35);
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillWaveBuffers(
  waves: WaveLayer[],
  dirs: Float32Array,
  amps: Float32Array,
  steeps: Float32Array,
  lens: Float32Array,
  speeds: Float32Array,
  warps: Float32Array,
) {
  dirs.fill(0); amps.fill(0); steeps.fill(0); lens.fill(1); speeds.fill(0); warps.fill(0);
  waves.forEach((w, i) => {
    if (i >= MAX_WAVES) return;
    dirs[i * 2]     = w.direction[0];
    dirs[i * 2 + 1] = w.direction[1];
    amps[i]   = w.amplitude;
    steeps[i] = w.steepness;
    lens[i]   = w.wavelength;
    speeds[i] = w.speed;
    warps[i]  = w.warpStrength ?? 0;
  });
}

function injectGerstner(
  shader: THREE.WebGLProgramParametersWithUniforms,
  uTime: { value: number },
  extraUniforms: Record<string, THREE.IUniform>,
  patchFragment = true,
) {
  Object.assign(shader.uniforms, { uTime, ...extraUniforms });

  shader.vertexShader = shader.vertexShader
    .replace("void main() {", VERT_PREAMBLE + "\nvoid main() {")
    .replace("#include <beginnormal_vertex>", VERT_NORMAL)
    .replace("#include <defaultnormal_vertex>", VERT_DEFAULT_NORMAL)
    .replace("#include <begin_vertex>", VERT_BEGIN);

  if (patchFragment) {
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", FRAG_PREAMBLE + "\nvoid main() {")
      .replace("#include <color_fragment>", FRAG_COLOR);
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface OceanTileProps {
  carrierWaves?: WaveLayer[];
  secondaryWaves?: WaveLayer[];
  modulationStrength?: number;
  secondaryNoiseScale?: number;
  secondaryNoiseStrength?: number;
  detailFBmScale?: number;
  detailFBmStrength?: number;
  detailFBmSpeed?: number;
  detailWindDir?: [number, number];
  terrainDamping?: number;
  roughness?: number;
  metalness?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

const OceanTile = ({
  carrierWaves = EMPTY_WAVES,
  secondaryWaves = EMPTY_WAVES,
  modulationStrength = 0.7,
  secondaryNoiseScale = 0.06,
  secondaryNoiseStrength = 0.7,
  detailFBmScale = 0.5,
  detailFBmStrength = 0.015,
  detailFBmSpeed = 0.04,
  detailWindDir = DEFAULT_WIND_DIR,
  terrainDamping = 0.9,
  roughness = 0.15,
  metalness = 0.0,
}: OceanTileProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const uTime   = useRef({ value: 0 });

  const heightmap = useTexture(heightmapUrl, (tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  });

  const dirs   = useMemo(() => new Float32Array(MAX_WAVES * 2), []);
  const amps   = useMemo(() => new Float32Array(MAX_WAVES), []);
  const steeps = useMemo(() => new Float32Array(MAX_WAVES), []);
  const lens   = useMemo(() => { const a = new Float32Array(MAX_WAVES); a.fill(1); return a; }, []);
  const speeds = useMemo(() => new Float32Array(MAX_WAVES), []);
  const warps  = useMemo(() => new Float32Array(MAX_WAVES), []);

  // Stable uniform object — values mutated in-place on prop change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const extraUniforms = useMemo<Record<string, THREE.IUniform>>(() => {
    const allWaves = [...carrierWaves, ...secondaryWaves];
    fillWaveBuffers(allWaves, dirs, amps, steeps, lens, speeds, warps);
    return {
      uWaveDirections:         { value: dirs },
      uWaveAmplitudes:         { value: amps },
      uWaveSteepnesses:        { value: steeps },
      uWaveWavelengths:        { value: lens },
      uWaveSpeeds:             { value: speeds },
      uWaveWarpStrengths:      { value: warps },
      uNumCarrierWaves:        { value: carrierWaves.length },
      uNumSecondaryWaves:      { value: secondaryWaves.length },
      uModulationStrength:     { value: modulationStrength },
      uSecondaryNoiseScale:    { value: secondaryNoiseScale },
      uSecondaryNoiseStrength: { value: secondaryNoiseStrength },
      uDetailFBmScale:         { value: detailFBmScale },
      uDetailFBmStrength:      { value: detailFBmStrength },
      uDetailFBmSpeed:         { value: detailFBmSpeed },
      uDetailWindDir:          { value: new THREE.Vector2(...detailWindDir) },
      uHeightmap:              { value: heightmap },
      uTerrainBounds:          { value: TERRAIN_BOUNDS },
      uTerrainDamping:         { value: terrainDamping },
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const allWaves = [...carrierWaves, ...secondaryWaves];
    fillWaveBuffers(allWaves, dirs, amps, steeps, lens, speeds, warps);
    extraUniforms.uNumCarrierWaves.value         = carrierWaves.length;
    extraUniforms.uNumSecondaryWaves.value        = secondaryWaves.length;
    extraUniforms.uModulationStrength.value       = modulationStrength;
    extraUniforms.uSecondaryNoiseScale.value      = secondaryNoiseScale;
    extraUniforms.uSecondaryNoiseStrength.value   = secondaryNoiseStrength;
    extraUniforms.uDetailFBmScale.value           = detailFBmScale;
    extraUniforms.uDetailFBmStrength.value        = detailFBmStrength;
    extraUniforms.uDetailFBmSpeed.value           = detailFBmSpeed;
    (extraUniforms.uDetailWindDir.value as THREE.Vector2).set(...detailWindDir);
    extraUniforms.uTerrainDamping.value           = terrainDamping;
  }, [
    carrierWaves, secondaryWaves, modulationStrength, secondaryNoiseScale,
    secondaryNoiseStrength, detailFBmScale, detailFBmStrength, detailFBmSpeed,
    detailWindDir, terrainDamping,
    dirs, amps, steeps, lens, speeds, warps, extraUniforms,
  ]);

  // customDepthMaterial — same vertex injection for correct shadow casting
  useEffect(() => {
    if (!meshRef.current) return;
    const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depthMat.onBeforeCompile = (s) => injectGerstner(s, uTime.current, extraUniforms, false);
    depthMat.customProgramCacheKey = () => "ocean-gerstner-depth";
    depthMat.needsUpdate = true;
    meshRef.current.customDepthMaterial = depthMat;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    uTime.current.value = clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      castShadow
    >
      <planeGeometry args={[60, 60, 512, 512]} />
      <meshStandardMaterial
        roughness={roughness}
        metalness={metalness}
        onBeforeCompile={(s) => injectGerstner(s, uTime.current, extraUniforms)}
        customProgramCacheKey={() => "ocean-gerstner"}
      />
    </mesh>
  );
};

export default OceanTile;
