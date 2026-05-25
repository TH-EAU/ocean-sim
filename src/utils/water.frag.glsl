#define MAX_STEP 255
#define MIN_DIST 0.01
#define MAX_DIST 100.0

uniform sampler2D uNormalMap;       // normal map (eau)
uniform sampler2D uReflectionTex;   // RenderTarget réflexion
uniform sampler2D uRefractionTex;   // RenderTarget réfraction
uniform sampler2D uDepthTexture;

uniform float uTime;
uniform vec2 uResolution;
uniform mat4 uProjectionMatrixInverse;
uniform mat4 uViewMatrixInverse;

  // ── Etat caméra ────────────────────────────────────────────
uniform bool uCameraIsUnderwater;
uniform float uNear;
uniform float uFar;

varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying vec2 vUv;

  // ── Propriétés optiques de l'eau ──────────────────────────
uniform vec3 uWaterColor;          // couleur de base
uniform float uWaterClarity;        // 0=opaque, 1=limpide
uniform vec3 uExtinctionColor;     // couleur d'extinction (Beer-Lambert)
uniform float uFresnelBias;         // biais fresnel (0..1)
uniform float uFresnelScale;        // échelle
uniform float uFresnelPower;        // puissance (5.0 = eau réelle)

  // ── Soleil ─────────────────────────────────────────────────
uniform vec3 uSunDir;              // direction normalisée vers le soleil
uniform vec3 uSunColor;            // couleur/intensité soleil

float linearizeDepth(float d) {
    return (2.0 * uNear) / (uFar + uNear - d * (uFar - uNear));
}

vec3 extinctionFactor(float depth) {
    vec3 extCoeff = vec3(0.45, 0.15, 0.06); // rouge absorbé 7x plus vite que bleu
    return exp(-depth * extCoeff * (1.0 / uWaterClarity));
}

vec3 waterNormal(vec2 uv) {
    float t = uTime * 0.05;
    vec2 uv1 = uv * 3.0 + vec2(t * 0.7, t * 0.5);
    vec2 uv2 = uv * 7.0 + vec2(-t * 0.4, t * 0.9);
    vec2 uv3 = uv * 15.0 + vec2(t * 0.3, -t * 0.6);

    // On pondère les couches : basse fréquence domine
    vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
    vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;

    return normalize(n1 * 0.5 + n2 * 0.3 + n3 * 0.2);
}

float fresnel(vec3 viewDir, vec3 normal) {
    float cosTheta = clamp(dot(normalize(viewDir), normal), 0.0, 1.0);
    return uFresnelBias + uFresnelScale * pow(1.0 - cosTheta, uFresnelPower);
}

float scattering(vec3 viewDir, vec3 sunDir, float depth) {
    float vdots = max(0.0, dot(-normalize(viewDir), sunDir));
    float mie = 0.5 * (1.0 + vdots * vdots); // phase Mie simplifiée
    return mie * exp(-depth * 0.3) * 0.3;
}

void main() {
    vec2 screenUV = gl_FragCoord.xy / uResolution;
     // ── Vecteur vue normalisé
    vec3 viewDir = normalize(vViewDir);
    vec3 N = waterNormal(vUv);
    vec2 distort = N.xz * 0.05;

        // ── RÉFRACTION avec aberration chromatique ─────────────────
    // Martinsh : décale chaque canal différemment pour imiter
    // la dispersion de Snell selon la longueur d'onde
    float aberr = 0.003;
    vec3 refrCol;
    refrCol.r = texture2D(uRefractionTex, screenUV + distort * 1.0 - aberr).r;
    refrCol.g = texture2D(uRefractionTex, screenUV + distort * 1.0).g;
    refrCol.b = texture2D(uRefractionTex, screenUV + distort * 1.0 + aberr).b;

    float rawDepth = texture2D(uDepthTexture, screenUV).r;
    float sceneDepth = linearizeDepth(rawDepth) * (uFar - uNear);
    float waterDepth = max(0.0, sceneDepth);

        // ── EXTINCTION (Beer-Lambert)
    vec3 extFactor = extinctionFactor(waterDepth);
    // Le fond "teinte" avec la couleur de l'eau en profondeur
    refrCol = mix(uWaterColor * 0.5, refrCol, extFactor);

    // ── SCATTERING
    float scatter = scattering(viewDir, uSunDir, waterDepth);
    vec3 scatCol = uWaterColor * scatter * uSunColor;

    // ── FRESNEL (mélange réflexion ↔ réfraction)
    float fresnelFactor = fresnel(viewDir, N);
    fresnelFactor = clamp(fresnelFactor, 0.0, 1.0);

    // ── ASSEMBLAGE FINAL ──────────────────────────────────────
    // vec3 waterSurface = mix(refrCol, reflCol, fresnelFactor);
    vec3 waterSurface = mix(refrCol, vec3(1.0, 1.0, 1.0), fresnelFactor);
    waterSurface += scatCol;
    waterSurface += uSunColor;

    // ── Tonemapping minimal (réel : utiliser post-processing)
    waterSurface = waterSurface / (waterSurface + 1.0); // Reinhard
    waterSurface = pow(waterSurface, vec3(1.0 / 2.2));  // gamma

    gl_FragColor = vec4(waterSurface, 0.95);
}

// void main() {
//     vec2 screenUV = gl_FragCoord.xy / uResolution;

//     // Depth de la scène derrière
//     float sceneDepth = texture2D(uDepthTexture, screenUV).r;
//     vec3 sceneWorld = reconstructWorldPos(screenUV, sceneDepth);

//     // Position world de la surface du mesh
//     vec3 meshWorld = reconstructWorldPos(screenUV, gl_FragCoord.z);

//     // 1. Couleur — absorption selon profondeur verticale
//     float verticalDepth = meshWorld.y - sceneWorld.y;
//     float t = clamp(verticalDepth / 5.20, 0.0, 1.0);
//     vec3 waterColor = vec3(0.2, 1.0 - t, 1.0);

//     // 2. Densité caméra — sphère autour du pixel
//     float sceneRayLength = length(sceneWorld - cameraPosition);
//     float meshRayLength = length(meshWorld - cameraPosition);
//     float rayPathLength = max(0.0, sceneRayLength - meshRayLength);
//     vec3 cameraToSurface = meshWorld - cameraPosition;
//     float cosTheta = abs(cameraToSurface.y) / length(cameraToSurface);
//     float densityCamera = clamp(rayPathLength * cosTheta / 5.0, 0.0, 1.0);

//     // 3. Densité profondeur — gradient depuis le fond
//     float densityDepth = smoothstep(1., .95, sceneDepth);

//     // 4. Densité finale
//     float finalDensity = clamp(densityCamera + densityDepth, 0.0, 1.0);

//     // Mix : couleur inchangée, densité contrôle l'imposition
//     vec3 finalColor = mix(vec3(1.0), waterColor, finalDensity);

//     gl_FragColor = vec4(finalColor, 1.0);
// }

// void main() {
//     vec2 screenUV = gl_FragCoord.xy / uResolution;

//     // Position world du fond (ce qu'il y a derrière)
//     float sceneDepth = texture2D(uDepthTexture, screenUV).r;
//     vec3 sceneWorld = reconstructWorldPos(screenUV, sceneDepth);

//     float rawSceneDepth = texture2D(uDepthTexture, screenUV).r;
//     float rayPathLength = max(0.0, sceneDepth - gl_FragCoord.z);

//     // Position world de la surface du mesh
//     vec3 meshWorld = reconstructWorldPos(screenUV, gl_FragCoord.z);

//     vec3 cameraToSurface = meshWorld - cameraPosition;
//     float cosTheta = abs(cameraToSurface.y) / length(cameraToSurface);
//     float verticalDensity = rayPathLength * cosTheta;

//     // Différence purement verticale, indépendante de la caméra
//     float verticalDepth = meshWorld.y - sceneWorld.y;

//     float t = clamp(verticalDepth / 0.20, 0.0, 1.0);
//     t = t * (pow(sceneDepth, 5.5));
//     gl_FragColor = vec4(0.2, 1.0 - t, 1.0, 1.0);
// }

//////
// vec2 screenUV = gl_FragCoord.xy / uResolution;

//     // Depth de la scène derrière
//     float sceneDepth = texture2D(uDepthTexture, screenUV).r;
//     vec3 sceneWorld = reconstructWorldPos(screenUV, sceneDepth);

//     // Position world de la surface du mesh
//     vec3 meshWorld = reconstructWorldPos(screenUV, gl_FragCoord.z);

//     // 1. Couleur — absorption selon profondeur verticale
//     float verticalDepth = meshWorld.y - sceneWorld.y;
//     float t = clamp(verticalDepth / 5.20, 0.0, 1.0);
//     vec3 waterColor = vec3(0.2, 1.0 - t, 1.0);

//     // 2. Densité caméra — sphère autour du pixel
//     float sceneRayLength = length(sceneWorld - cameraPosition);
//     float meshRayLength = length(meshWorld - cameraPosition);
//     float rayPathLength = max(0.0, sceneRayLength - meshRayLength);
//     vec3 cameraToSurface = meshWorld - cameraPosition;
//     float cosTheta = abs(cameraToSurface.y) / length(cameraToSurface);
//     float densityCamera = clamp(rayPathLength * cosTheta / 5.0, 0.0, 1.0);

//     // 3. Densité profondeur — gradient depuis le fond
//     float densityDepth = smoothstep(1., .95, sceneDepth);

//     // 4. Densité finale
//     float finalDensity = clamp(densityCamera + densityDepth, 0.0, 1.0);

//     // Mix : couleur inchangée, densité contrôle l'imposition
//     vec3 finalColor = mix(vec3(1.0), waterColor, finalDensity);

//     gl_FragColor = vec4(finalColor, 1.0);