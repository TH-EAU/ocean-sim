// World XZ position before any displacement (modelMatrix includes tile offset + rotation)
vec2 worldXZ = (modelMatrix * vec4(position, 1.0)).xz;

vec3 totalDisp   = vec3(0.0);
vec3 normalDelta = vec3(0.0);
vec2 warpedXZ    = worldXZ;

for (int i = 0; i < MAX_WAVES; i++) {
    if (i >= uWaveCount) break;

    vec4 da = uWaveDirAmp[i];   // .xy = dir, .z = amplitude, .w = wavelength
    vec4 pm = uWaveParams[i];   // .x = Q (steepness), .y = omega, .z = warpStrength

    float k = 2.0 * PI / da.w;
    GerstnerOut g = gerstnerWave(warpedXZ, da.xy, da.z, k, pm.x, pm.y, uTime);

    totalDisp   += g.disp;
    normalDelta += g.normalDelta;

    // Domain warp: offset next wave's sample position by accumulated horizontal displacement
    warpedXZ += totalDisp.xz * pm.z;
}

// Apply displacement: world (dx, dy_up, dz) → local (dx, -dz, dy_up)
// Mesh is rotated -PI/2 around X: local.y → world.-z, local.z → world.y
vec3 pos = position;
pos.x += totalDisp.x;
pos.y -= totalDisp.z;
pos.z += totalDisp.y;

#ifdef OCEAN_USE_NORMALS
// world normal → local: (nx, ny, nz) → (nx, -nz, ny)
vec3 worldN = normalize(vec3(normalDelta.x, 1.0 + normalDelta.y, normalDelta.z));
objectNormal = normalize(vec3(worldN.x, -worldN.z, worldN.y));
vOceanNormal = objectNormal;
#endif

transformed = pos;
vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
