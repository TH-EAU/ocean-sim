// ============================================================
// Vertex shader — N Gerstner waves, world-space domain
// ============================================================

uniform float uTime;

// Wave arrays
uniform vec2  uWaveDirections[MAX_WAVES];
uniform float uWaveAmplitudes[MAX_WAVES];
uniform float uWaveSteepnesses[MAX_WAVES];
uniform float uWaveWavelengths[MAX_WAVES];
uniform float uWaveSpeeds[MAX_WAVES];
uniform float uWaveWarpStrengths[MAX_WAVES];

// Terrain heightmap — amplitude attenuation near land
uniform sampler2D uHeightmap;
uniform vec4      uTerrainBounds;  // (minX, minZ, maxX, maxZ) world space
uniform float     uTerrainDamping;

varying vec3  vNormal;
varying vec3  vWorldPos;
varying float vTerrainH;

void main() {
    // ── World-space base ──────────────────────────────────────────
    vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
    vec2 xz        = worldBase.xz;

    // ── Terrain attenuation ───────────────────────────────────────
    vec2  hUV      = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
    float h        = texture(uHeightmap, hUV).r;
    float ampScale = 1.0 - h * uTerrainDamping;

    // ── Accumulate Gerstner waves ─────────────────────────────────
    vec3 displaced = worldBase;
    vec3 ddx = vec3(1.0, 0.0, 0.0);
    vec3 ddz = vec3(0.0, 0.0, 1.0);

    for (int i = 0; i < MAX_WAVES; i++) {
        float A = uWaveAmplitudes[i] * ampScale;
        if (A < 0.0001) continue;

        vec2  D = normalize(uWaveDirections[i]);
        float Q = uWaveSteepnesses[i];
        float L = uWaveWavelengths[i];

        float w   = 6.28318 / L;
        float spd = sqrt(9.81 / w) * uWaveSpeeds[i];

        // Per-wave domain warp
        float ws = uWaveWarpStrengths[i];
        vec2 xzWarped = xz + vec2(
            sin(xz.y * 0.17 + uTime * 0.031) * ws,
            sin(xz.x * 0.23 + uTime * 0.024) * ws
        );

        float phase = dot(D, xzWarped) * w + uTime * spd;
        float sinP  = sin(phase);
        float cosP  = cos(phase);

        displaced.x += (D.x / w) * A * Q * cosP;
        displaced.z += (D.y / w) * A * Q * cosP;
        displaced.y += A * sinP;

        ddx.x += -D.x * D.x * A * Q * w * sinP;
        ddx.y +=  D.x * A * w * cosP;
        ddx.z += -D.x * D.y * A * Q * w * sinP;

        ddz.x += -D.x * D.y * A * Q * w * sinP;
        ddz.y +=  D.y * A * w * cosP;
        ddz.z += -D.y * D.y * A * Q * w * sinP;
    }

    vNormal   = normalize(cross(ddz, ddx));
    vWorldPos = displaced;
    vTerrainH = h;

    gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
}
