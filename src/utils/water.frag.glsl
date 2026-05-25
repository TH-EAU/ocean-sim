#define MAX_STEP 255
#define MIN_DIST 0.01
#define MAX_DIST 100.0

uniform sampler2D uNormalMap;       // normal map (eau)
uniform sampler2D uReflectionTex;   // RenderTarget réflexion
uniform sampler2D uRefractionTex;   // RenderTarget réfraction
uniform sampler2D uDepthTexture;
uniform vec3 uAbsorptionColor;
uniform float uDensity;
uniform float uMaxThickness;
uniform vec3 uScatterColor;
uniform float uScatterStrength;
uniform sampler2D depthSampler;

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
varying vec3 vNormal;
varying vec4 vScreenPos;

uniform vec2 uTerrainOffset; // coin bas-gauche du terrain (-30, -30)
uniform vec2 uTerrainSize;   // taille totale (60, 60)

uniform vec3 uExtinctionCoeff;
uniform float uWaterDensity;

uniform float uWaterDepth; // profondeur max en unités monde
uniform float uWaterScale;

uniform float uHeightScale;

uniform float uDepthDensityScale;

vec3 reconstructWorldPos(vec2 uv, float depth) {
    vec3 ndc = vec3(uv * 2.0 - 1.0, depth * 2.0 - 1.0);
    vec4 viewPos = uProjectionMatrixInverse * vec4(ndc, 1.0);
    viewPos /= viewPos.w;
    vec4 worldPos = uViewMatrixInverse * viewPos;
    return worldPos.xyz;
}

float linearizeDepth(float d) {
    return (2.0 * uNear) / (uFar + uNear - d * (uFar - uNear));
}

// vec3 extinctionFactor(float depth) {
//     vec3 extCoeff = vec3(0.45, 0.15, 0.06); // rouge absorbé 7x plus vite que bleu
//     return exp(-depth * extCoeff * (1.0 / uWaterClarity));
// }

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

    // vec2 screenUV = gl_FragCoord.xy / uResolution;

void main() {
    vec2 screenUV = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;

    // face avant du volume — position monde du fragment de surface
    float frontDepth = gl_FragCoord.z * 2.0 - 1.0; // NDC
    vec3 frontWorld = reconstructWorldPos(screenUV, gl_FragCoord.z);

    // fond de scène depuis depth texture
    float sceneDepth = texture2D(uDepthTexture, screenUV).r;
    vec3 sceneWorld = reconstructWorldPos(screenUV, sceneDepth);

    // épaisseur traversée
    float thickness = clamp(length(sceneWorld - frontWorld), 0.0, uMaxThickness);

    // BEER-LAMBERT
// distance verticale surface → fond sous ce fragment
    float localDepth = frontWorld.y - sceneWorld.y; // positif car frontWorld.y > sceneWorld.y

// densité qui augmente avec la profondeur locale
    float localDensity = uWaterDensity * exp(localDepth * uDepthDensityScale);

    vec3 extinctionCoeff = uExtinctionCoeff * localDensity;
    vec3 transmittance = exp(-extinctionCoeff * thickness);

    // REFRACTION
    vec3 N = vNormal;
    vec2 distort = N.xy * 0.03;
    vec2 rcoord = reflect(normalize(vViewDir), N).xz;
    float aberration = 0.002;

    vec3 refraction;
    refraction.r = texture2D(uRefractionTex, screenUV + distort).r;
    refraction.g = texture2D(uRefractionTex, screenUV + distort - rcoord * aberration).g;
    refraction.b = texture2D(uRefractionTex, screenUV + distort - rcoord * aberration * 2.0).b;

    // ASSEMBLAGE
    vec3 waterColor = vec3(0.0, 0.08, 0.3);
    vec3 color = refraction * transmittance + waterColor * (1.0 - transmittance);

    gl_FragColor = vec4(color, 1.0);
}
// void main() {
//     vec2 screenUV = gl_FragCoord.xy / uResolution;

//     // Position world du fond (ce qu'il y a derrière)
//     float sceneDepth = texture2D(uDepthTexture, screenUV).r;
//     // vec3 sceneWorld = reconstructWorldPos(screenUV, sceneDepth);

//     float rawSceneDepth = texture2D(uDepthTexture, screenUV).r;
//     float rayPathLength = max(0.0, sceneDepth - gl_FragCoord.z);

//     // Position world de la surface du mesh
//     // vec3 meshWorld = reconstructWorldPos(screenUV, gl_FragCoord.z);

//     // vec3 cameraToSurface = meshWorld - cameraPosition;
//     // float cosTheta = abs(cameraToSurface.y) / length(cameraToSurface);
//     // float verticalDensity = rayPathLength * cosTheta;

//     // Différence purement verticale, indépendante de la caméra

//     vec2 coo = clamp((vWorldPosition.xz - uTerrainOffset) / uTerrainSize, 0.0, 1.0);
//     float depth = texture2D(depthSampler, coo).r;
//     float sceneWorldY = depth * uWaterDepth * -1.0; // Y monde du fond, négatif car sous l'eau

//     float verticalDepth = vWorldPosition.y - sceneWorldY;

//     float t = clamp(verticalDepth / 0.020, 0.0, 1.0);
//     t = t * (pow(sceneDepth, 0.5));
//     gl_FragColor = vec4(0.2, 1.0 - t, 1.0, 1.0);
// }

/////
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