uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindSpeed;
uniform vec2 uTileOffset;
uniform vec2 uCurrentDir;
uniform float uCurrentSpeed;
uniform float uWaveAmplitude;
uniform sampler2D uTerrainHeight;

uniform vec4 uTerrainBounds;

varying vec3 vOceanWorldPos;
varying vec3 vOceanNormal;
