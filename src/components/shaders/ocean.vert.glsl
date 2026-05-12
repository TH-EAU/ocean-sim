// ============================================================
// Vertex shader — N Gerstner waves, world-space domain
// Groups (in order): [0, uNumCarrierWaves)               → carrier
//                    [uNumCarrierWaves, +uNumSecondaryWaves) → secondary (modulated)
// Detail micro-displacement: fBm noise (aperiodic)
// ============================================================

uniform float uTime;

// Wave arrays
uniform vec2  uWaveDirections[MAX_WAVES];
uniform float uWaveAmplitudes[MAX_WAVES];
uniform float uWaveSteepnesses[MAX_WAVES];
uniform float uWaveWavelengths[MAX_WAVES];
uniform float uWaveSpeeds[MAX_WAVES];
uniform float uWaveWarpStrengths[MAX_WAVES];

// Wave groups
uniform int   uNumCarrierWaves;
uniform int   uNumSecondaryWaves;
uniform float uModulationStrength;
uniform float uSecondaryNoiseScale;
uniform float uSecondaryNoiseStrength;

// Detail fBm
uniform float uDetailFBmScale;
uniform float uDetailFBmStrength;
uniform float uDetailFBmSpeed;
uniform vec2  uDetailWindDir;

// Terrain heightmap — amplitude attenuation near land
uniform sampler2D uHeightmap;
uniform vec4      uTerrainBounds;
uniform float     uTerrainDamping;

varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vTerrainH;
varying float vSelfShadow; // [-1, 1]: -1 = wave trough, +1 = wave crest

// Three.js shadow map — varyings + shadow matrix uniforms
#include <common>
#include <shadowmap_pars_vertex>

// ── Value noise (aperiodic, infinite domain) ──────────────────
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i),                  hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// 3-octave fBm — output in [-1, 1]
float fbmDetail(vec2 p) {
    float v = 0.0, a = 0.5, f = 1.0;
    for (int k = 0; k < 3; k++) {
        v += a * valueNoise(p * f);
        a *= 0.5;
        f *= 2.0;
    }
    return v * 2.0 - 1.0;
}

// Sinusoidal domain warp — used for carriers
vec2 warpedXZ(int i, vec2 xz) {
    float ws = uWaveWarpStrengths[i];
    return xz + vec2(
        sin(xz.y * 0.17 + uTime * 0.031) * ws,
        sin(xz.x * 0.23 + uTime * 0.024) * ws
    );
}

void main() {
    // ── World-space base ──────────────────────────────────────────
    vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
    vec2 xz        = worldBase.xz;

    // ── Terrain attenuation ───────────────────────────────────────
    vec2  hUV      = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
    float h        = texture(uHeightmap, hUV).r;
    float ampScale = 1.0 - h * uTerrainDamping;

    // ── Secondary noise ───────────────────────────────────────────
    vec2  envUV           = xz * uSecondaryNoiseScale + vec2(uTime * 0.012, uTime * 0.007);
    float envelope        = valueNoise(envUV);
    float secondaryEnvelope = 1.0 - uSecondaryNoiseStrength * (1.0 - envelope);

    float warpFreq = uSecondaryNoiseScale * 0.7;
    vec2 noiseWarp2D = vec2(
        valueNoise(xz * warpFreq + vec2(31.4, 92.6) + uTime * 0.008),
        valueNoise(xz * warpFreq + vec2(64.2, 17.8) + uTime * 0.006)
    ) * 2.0 - 1.0;

    // ── Pre-pass: carrier height for secondary modulation ─────────
    float carrierY      = 0.0;
    float carrierAmpSum = 0.0;
    for (int i = 0; i < MAX_WAVES; i++) {
        if (i >= uNumCarrierWaves) break;
        float A = uWaveAmplitudes[i] * ampScale;
        if (A < 0.0001) continue;
        vec2  D   = normalize(uWaveDirections[i]);
        float w   = 6.28318 / uWaveWavelengths[i];
        float spd = sqrt(9.81 / w) * uWaveSpeeds[i];
        float phase = dot(D, warpedXZ(i, xz)) * w + uTime * spd;
        carrierY      += A * sin(phase);
        carrierAmpSum += A;
    }
    float modFactor = 1.0;
    if (carrierAmpSum > 0.0) {
        float t = carrierY / carrierAmpSum;
        modFactor = max(0.0, 1.0 + uModulationStrength * t);
    }

    // ── Accumulate Gerstner waves ─────────────────────────────────
    vec3  displaced = worldBase;
    vec3  ddx     = vec3(1.0, 0.0, 0.0);
    vec3  ddz     = vec3(0.0, 0.0, 1.0);
    float ampSum  = 0.0;

    for (int i = 0; i < MAX_WAVES; i++) {
        float A = uWaveAmplitudes[i] * ampScale;
        bool isSecondary = (i >= uNumCarrierWaves) && (i < uNumCarrierWaves + uNumSecondaryWaves);

        if (isSecondary) A *= modFactor * secondaryEnvelope;
        if (A < 0.0001) continue;

        vec2  D = normalize(uWaveDirections[i]);
        float Q = uWaveSteepnesses[i];
        float L = uWaveWavelengths[i];
        float w   = 6.28318 / L;
        float spd = sqrt(9.81 / w) * uWaveSpeeds[i];

        vec2 xzW = isSecondary
            ? xz + noiseWarp2D * uWaveWarpStrengths[i]
            : warpedXZ(i, xz);

        float phase = dot(D, xzW) * w + uTime * spd;
        float sinP  = sin(phase);
        float cosP  = cos(phase);

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

    // vSelfShadow: normalized Gerstner height before fBm, used for self-shadowing
    // worldBase.y = 0 for a flat plane, so displaced.y = Gerstner Y sum
    vSelfShadow = ampSum > 0.0 ? clamp(displaced.y / ampSum, -1.0, 1.0) : 0.0;

    // ── Detail: fBm micro-displacement + gradient for normals ─────
    if (uDetailFBmStrength > 0.0) {
        vec2 detailUV = xz * uDetailFBmScale + uDetailWindDir * uTime * uDetailFBmSpeed;
        displaced.y  += uDetailFBmStrength * fbmDetail(detailUV);

        // Central differences for fBm gradient — corrects normals
        const float EPS = 0.15; // world-space step in metres
        vec2 dxUV = vec2(EPS * uDetailFBmScale, 0.0);
        vec2 dzUV = vec2(0.0, EPS * uDetailFBmScale);
        float dy_dx = (fbmDetail(detailUV + dxUV) - fbmDetail(detailUV - dxUV)) / (2.0 * EPS);
        float dy_dz = (fbmDetail(detailUV + dzUV) - fbmDetail(detailUV - dzUV)) / (2.0 * EPS);
        ddx.y += uDetailFBmStrength * dy_dx;
        ddz.y += uDetailFBmStrength * dy_dz;
    }

    vNormal   = normalize(cross(ddz, ddx));
    vWorldPos = displaced;
    vTerrainH = h;

    gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
}
