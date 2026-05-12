// ============================================================
// Fragment shader — Blinn-Phong + Fresnel + analytical sky
// ============================================================

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vTerrainH;
varying float vSelfShadow; // [-1, 1]: trough → crest

#include <common>
#include <packing>
#include <shadowmap_pars_fragment>

uniform float uTime;

// Normal map
uniform sampler2D uNormalMap;
uniform float uNormalStrength;
uniform float uNormalScale;
uniform float uNormalWarp;

uniform float uFresnelStrength;
uniform float uFresnelAlpha;
uniform float uWaterDensity;
uniform float uTransmission;
uniform float uScatterDensity;
uniform float uScatterPower;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform vec3 uFogColor;
uniform float uFogDensity;

const vec3 COLOR_CLEAR = vec3(0.82, 0.97, 0.97);
const vec3 COLOR_SHALLOW = vec3(0.00, 0.76, 0.78);
const vec3 COLOR_DEEP = vec3(0.01, 0.14, 0.38);
const float R0 = 0.02;

vec3 skyColor(vec3 dir) {
    float up = max(dir.y, 0.0);
    vec3 zenith = vec3(0.08, 0.28, 0.75);
    vec3 horizon = vec3(0.58, 0.75, 0.92);
    vec3 sky = mix(horizon, zenith, smoothstep(0.0, 0.40, up));

    float sunAz = max(0.0, dot(normalize(dir), uLightDir));
    float hGlow = (1.0 - smoothstep(0.0, 0.15, up)) * pow(sunAz, 3.0);
    sky = mix(sky, vec3(1.0, 0.65, 0.25), hGlow * 0.55);
    sky += vec3(1.0, 0.80, 0.45) * pow(max(0.0, sunAz), 8.0) * 0.45;
    sky += vec3(1.6, 1.3, 0.8) * smoothstep(0.9993, 1.0, dot(normalize(dir), uLightDir));
    return sky;
}

void main() {
    vec2 xz = vWorldPos.xz;

    // ── Normal map — two scrolling layers + domain warp ───────────
    vec2 warp = vec2(
            sin(xz.y * 0.18 + uTime * 0.05) * uNormalWarp,
            sin(xz.x * 0.22 + uTime * 0.04) * uNormalWarp
        );
    vec2 uv1 = xz * uNormalScale + warp + uTime * vec2(0.018, 0.009);
    vec2 uv2 = xz * uNormalScale * 1.7 + warp * 0.6 - uTime * vec2(0.013, 0.021);

    vec3 nm1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 nm2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
    vec3 nm = normalize(nm1 + nm2);
    vec3 N = normalize(vNormal + vec3(nm.x, 0.0, nm.y) * uNormalStrength);

    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // ── Self-shadow factor ────────────────────────────────────────
    // Troughs (vSelfShadow < 0) are partially occluded by adjacent crests.
    // smoothstep maps [-1, 0.4] → [0, 1]: deep trough = 0, crest = 1.
    float selfShadow = smoothstep(-1.0, 0.4, vSelfShadow);

    float depth = 1.0 - vTerrainH;

    // ── Water colour ─────────────────────────────────────────────
    vec3 waterColor = mix(COLOR_CLEAR, COLOR_SHALLOW, smoothstep(0.05, 0.40, depth));
    waterColor = mix(waterColor, COLOR_DEEP, smoothstep(0.40, 1.00, depth));
    waterColor += COLOR_SHALLOW * smoothstep(0.65, 1.0, N.y) * 0.18;

    // ── Fresnel (Schlick) ────────────────────────────────────────
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = R0 + (1.0 - R0) * pow(1.0 - NdotV, 5.0);

    vec3 reflDir = reflect(-V, N);
    vec3 reflected = skyColor(reflDir);
    vec3 baseColor = mix(waterColor, reflected, fresnel * uFresnelStrength);

    // ── Diffuse + Specular, attenuated in troughs ─────────────────
    float diff = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 128.0) * fresnel;

    // Troughs: direct light reduced (crest ahead occludes the sun)
    float shadowedDiff = diff * mix(0.12, 1.0, selfShadow);
    float shadowedSpec = spec * selfShadow;

    // ── Final composite ──────────────────────────────────────────
    vec3 color = uAmbientColor * baseColor
            + uLightColor * baseColor * shadowedDiff
            + uLightColor * shadowedSpec;

    // ── Volumetric SSS ───────────────────────────────────────────
    // float waveVol    = max(0.0, vWorldPos.y);
    // vec3  extinction = vec3(2.5, 0.25, 0.08);
    // vec3  transColor = exp(-extinction * waveVol * uScatterDensity);
    // float fwdScatter = pow(max(0.0, dot(-V, L)), uScatterPower);
    // color += transColor * fwdScatter * uTransmission * selfShadow;

    // ── Alpha (Beer-Lambert) + wave-depth shadow ──────────────────
    // Troughs have more water column above → more absorption → darker/less transparent.
    // waveDepthFactor in [1, 1.6]: 1 at crest, up to 1.6 at deepest trough.
    float waveDepthFactor = 1.0 + max(0.0, -vSelfShadow) * 0.6;
    float viewCos = max(dot(V, vec3(0.0, 1.0, 0.0)), 0.04);
    float pathLength = depth / viewCos;
    float alpha = 1.0 - exp(-uWaterDensity * pathLength * waveDepthFactor);
    alpha = max(alpha, fresnel * uFresnelAlpha);

    gl_FragColor = vec4(color, alpha);

    // ── Exponential fog ───────────────────────────────────────────
    float fogDist = length(cameraPosition - vWorldPos);
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * fogDist * fogDist);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, clamp(fogFactor, 0.0, 1.0));
}
