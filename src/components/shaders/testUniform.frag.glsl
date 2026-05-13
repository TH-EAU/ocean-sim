varying vec2 vScreenUV;
varying float vPlaneViewZ;
varying float vFresnelDot;

uniform sampler2D uDepthTexture;
uniform float cameraNear;
uniform float cameraFar;
uniform float uMaxDistance;