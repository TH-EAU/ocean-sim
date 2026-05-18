uniform float uTime;
uniform vec2  uTileOffset;

uniform int   uWaveCount;
uniform vec4  uWaveDirAmp[MAX_WAVES];   // .xy = direction, .z = amplitude, .w = wavelength
uniform vec4  uWaveParams[MAX_WAVES];   // .x = Q (steepness), .y = omega, .z = isSecondary (0|1), .w = warpStrength
uniform vec4  uWaveExtra[MAX_WAVES];    // .x = warpSize (spatial freq, default 0.17)

uniform int   uNumCarrierWaves;
uniform float uSecondaryNoiseScale;
uniform float uSecondaryNoiseStrength;

uniform sampler2D uHeightmap;
uniform vec4      uTerrainBounds;       // (minX, minZ, maxX, maxZ)
uniform float     uTerrainDamping;

varying vec3 vOceanWorldPos;
varying vec3 vOceanNormal;
