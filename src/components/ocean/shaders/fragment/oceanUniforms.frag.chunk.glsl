uniform vec2 uTileOffset;

uniform sampler2D uDepthTexture;
uniform vec2 uResolution;
uniform float uDepthScale;
uniform float uDepthFade;
uniform float cameraNear;
uniform float cameraFar;

uniform sampler2D uSceneColor;
uniform float uReflectionStrength;
uniform float uReflectionBlend;

uniform vec3 uSunDirection;
uniform float uFresnelPower;
uniform float uSpecularPower;
uniform float uSpecularIntensity;

varying vec3 vOceanNormal;
varying vec3 vOceanWorldPos;

uniform vec4 uTerrainBounds;
uniform sampler2D uHeightmap;
uniform sampler2D uTerrainHeight;
uniform float uHeightScale;
uniform float uTerrainDepth;