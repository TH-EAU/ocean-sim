uniform sampler2D uDepthTexture;
uniform vec2 uResolution;
uniform float uDepthScale;

uniform float cameraNear;
uniform float cameraFar;

uniform vec3 uSunDirection;
uniform float uFresnelPower;

varying vec3 vOceanNormal;
varying vec3 vOceanWorldPos;
