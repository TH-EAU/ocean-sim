vec2 worldXZ = (modelMatrix * vec4(position, 1.0)).xz;

// 1 — Heightmap attenuation near terrain
vec2  hUV      = clamp((worldXZ - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
float terrH    = texture2D(uHeightmap, hUV).r;
float ampScale = 1.0 - terrH * uTerrainDamping;

// 2 — Secondary wave noise envelope (spatial modulation)
vec2  envUV  = worldXZ * uSecondaryNoiseScale + vec2(uTime * 0.012, uTime * 0.007);
float secEnv = 1.0 - uSecondaryNoiseStrength * (1.0 - valueNoise(envUV));

// 3 — Carrier height pre-pass (modulates secondary wave amplitude)
float carrierY = 0.0, carrierAmpSum = 0.0;
for (int i = 0; i < MAX_WAVES; i++) {
    if (i >= uNumCarrierWaves) break;
    float A   = uWaveDirAmp[i].z * ampScale;
    float k   = 6.28318 / uWaveDirAmp[i].w;
    float phi = k * dot(normalize(uWaveDirAmp[i].xy), worldXZ) - uWaveParams[i].y * uTime;
    carrierY      += A * sin(phi);
    carrierAmpSum += A;
}
float modFactor = carrierAmpSum > 0.0
    ? max(0.0, 1.0 + 0.5 * carrierY / carrierAmpSum)
    : 1.0;

// 4 — Accumulate all Gerstner waves
vec3 pos = position;
#ifdef OCEAN_USE_NORMALS
vec3 normalDeltaSum = vec3(0.0);
#endif

for (int i = 0; i < MAX_WAVES; i++) {
    if (i >= uWaveCount) break;
    float A = uWaveDirAmp[i].z * ampScale;
    if (uWaveParams[i].z > 0.5) A *= modFactor * secEnv;   // secondary wave: apply envelope
    if (A < 0.001) continue;

    float k = 6.28318 / uWaveDirAmp[i].w;
    float ws = uWaveParams[i].w;
    float warpFreq = uWaveExtra[i].x;
    vec2 sampleXZ = ws > 0.001 ? worldXZ + vec2(
        sin(worldXZ.y * warpFreq + uTime * 0.031) * ws,
        sin(worldXZ.x * warpFreq * 1.35 + uTime * 0.024) * ws
    ) : worldXZ;
    GerstnerOut g = gerstnerWave(sampleXZ, uWaveDirAmp[i].xy, A, k, uWaveParams[i].x, uWaveParams[i].y, uTime);

    // world (dx, dy_up, dz) → local (dx, -dz, dy_up) — mesh tourné -PI/2 autour de X
    pos.x += g.disp.x;
    pos.y -= g.disp.z;
    pos.z += g.disp.y;
    #ifdef OCEAN_USE_NORMALS
    normalDeltaSum += g.normalDelta;
    #endif
}

#ifdef OCEAN_USE_NORMALS
vec3 worldN = normalize(vec3(normalDeltaSum.x, 1.0 + normalDeltaSum.y, normalDeltaSum.z));
objectNormal = normalize(vec3(worldN.x, -worldN.z, worldN.y));
vOceanNormal = objectNormal;
#endif

transformed = pos;
vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
