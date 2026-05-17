uniform float uTime;
uniform vec2 uTileOffset;

uniform int uWaveCount;
uniform vec4 uWaveDirAmp[MAX_WAVES];  // .xy = direction, .z = amplitude, .w = wavelength
uniform vec4 uWaveParams[MAX_WAVES];  // .x = steepness (Q), .y = speed (ω), .z = warpStrength, .w = unused

varying vec3 vOceanWorldPos;
varying vec3 vOceanNormal;

uniform vec2  uCurrentDirection;
uniform float uDisturbtion;
