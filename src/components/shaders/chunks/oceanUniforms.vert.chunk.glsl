uniform float uTime;

uniform vec2 uWaveDirections[MAX_WAVES];
uniform float uWaveAmplitudes[MAX_WAVES];
uniform float uWaveSteepnesses[MAX_WAVES];
uniform float uWaveWavelengths[MAX_WAVES];
uniform float uWaveSpeeds[MAX_WAVES];
uniform float uWaveWarpStrengths[MAX_WAVES];

uniform int uNumCarrierWaves;
uniform int uNumSecondaryWaves;
uniform float uModulationStrength;
uniform float uSecondaryNoiseScale;
uniform float uSecondaryNoiseStrength;

uniform float uDetailFBmScale;
uniform float uDetailFBmStrength;
uniform float uDetailFBmSpeed;
uniform vec2 uDetailWindDir;

uniform sampler2D uHeightmap;
uniform vec4 uTerrainBounds;
uniform float uTerrainDamping;

varying vec3 vWorldPos;
varying float vTerrainH;
varying float vSelfShadow;
