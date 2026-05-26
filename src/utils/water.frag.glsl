uniform sampler2D uNormalMap;
uniform sampler2D uRefractionTex;
uniform sampler2D uDepthTexture;
uniform sampler2D depthSampler;

uniform float uTime;
uniform vec2 uResolution;
uniform mat4 uProjectionMatrixInverse;
uniform mat4 uViewMatrixInverse;

uniform vec2 uTerrainOffset;
uniform vec2 uTerrainSize;
uniform float uHeightScale;

uniform float uMaxThickness;
uniform vec3 uExtinctionCoeff;
uniform float uWaterDensity;
uniform float uDepthDensityScale;

uniform float uFresnelBias;
uniform float uFresnelScale;
uniform float uFresnelPower;

varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying vec2 vUv;
varying vec3 vNormal;
varying vec4 vScreenPos;

precision highp float;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;

vec3 reconstructWorldPos(vec2 uv, float depth) {
    vec3 ndc = vec3(uv * 2.0 - 1.0, depth * 2.0 - 1.0);
    vec4 viewPos = uProjectionMatrixInverse * vec4(ndc, 1.0);
    viewPos /= viewPos.w;
    vec4 worldPos = uViewMatrixInverse * viewPos;
    return worldPos.xyz;
}

vec3 waterNormal(vec2 uv) {
    float t = uTime * 0.05;
    vec3 n1 = texture2D(uNormalMap, uv * 3.0 + vec2(t * 0.7, t * 0.5)).rgb * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, uv * 7.0 + vec2(-t * 0.4, t * 0.9)).rgb * 2.0 - 1.0;
    vec3 n3 = texture2D(uNormalMap, uv * 15.0 + vec2(t * 0.3, -t * 0.6)).rgb * 2.0 - 1.0;
    return normalize(n1 * 0.5 + n2 * 0.3 + n3 * 0.2);
}

float fresnel_dielectric(vec3 incoming, vec3 normal, float eta) {
    float c = dot(incoming, normal); // pas de abs()
    if(c < 0.0)
        return 1.0;        // normale inversée → réflexion totale
    float g = eta * eta - 1.0 + c * c;
    if(g > 0.0) {
        g = sqrt(g);
        float A = (g - c) / (g + c);
        float B = (c * (g + c) - 1.0) / (c * (g - c) + 1.0);
        return 0.5 * A * A * (1.0 + B * B);
    }
    return 1.0;
}

void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    float NdotV = dot(normalize(vWorldNormal), viewDir);
    float fresnel = uFresnelBias + (1.0 - uFresnelBias) *
        pow(clamp(1.0 - NdotV, 0.0, 1.0), uFresnelPower);

    gl_FragColor = vec4(vec3(1.0), 1.0);
}
// void main() {
//     vec2 screenUV = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;

//     float frontDepth = (vScreenPos.z / vScreenPos.w) * 0.5 + 0.5;
//     vec3 frontWorld = reconstructWorldPos(screenUV, frontDepth);

//     vec3 N = normalize(vNormal + waterNormal(vUv));
//     vec3 viewDir = normalize(vViewDir);

//     // REFRACTION PHYSIQUE
//     vec3 refractDir = refract(-viewDir, N, 1.0 / 1.333);
//     vec2 distort = refractDir.xz * 0.01;
//     vec2 rcoord = reflect(-viewDir, N).xz;
//     float aberration = 0.002;

//     vec2 distortedUV = clamp(screenUV + distort, 0.001, 0.999);

//     float sceneDepth = texture2D(uDepthTexture, distortedUV).r;
//     vec3 sceneWorld = reconstructWorldPos(distortedUV, sceneDepth);

//     float thickness = clamp(length(sceneWorld - frontWorld), 0.0, uMaxThickness);
//     float localDepth = frontWorld.y - sceneWorld.y;

//     // REFRACTION
//     vec3 refraction;
//     refraction.r = texture2D(uRefractionTex, distortedUV).r;
//     refraction.g = texture2D(uRefractionTex, distortedUV - rcoord * aberration).g;
//     refraction.b = texture2D(uRefractionTex, distortedUV - rcoord * aberration * 2.0).b;

//     // BEER-LAMBERT
//     float localDensity = uWaterDensity * exp(localDepth * uDepthDensityScale);
//     vec3 extinctionCoeff = uExtinctionCoeff * localDensity;
//     vec3 transmittance = exp(-extinctionCoeff * thickness);

//     vec3 waterColor = vec3(0.0078, 0.5176, 0.700);
//     vec3 refractionColor = refraction * transmittance + waterColor * (1.0 - transmittance);

//     // FRESNEL diélectrique — formule Martinsh
//     float ior = 1.333 / 1.0;
//     float fresnelFactor = fresnel_dielectric(dot(-viewDir, N) > 0.0 ? -viewDir : viewDir, N, 1.333);

//     // réflexion — ciel en fallback
//     vec3 skyColor = vec3(0.5, 0.7, 0.9);

//     // assemblage — fresnel plafonné à 0.6 comme Martinsh
//     vec3 color = mix(refractionColor, skyColor, fresnelFactor * 0.6);

//     gl_FragColor = vec4(color, 1.0);
// }