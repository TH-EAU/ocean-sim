varying vec3 vWorldPos;
varying float vTerrainH;
varying float vDepth;

uniform vec3 uSunDirection;
uniform sampler2D uNormalMap;
uniform float uNormalStrength;
uniform float uNormalScale;
uniform float uNormalWarp;
uniform float uFresnelStrenght;
uniform float uTime;

uniform sampler2D uSceneDepth;
uniform mat4 uInvProjView;
uniform float uDepthFade;
uniform float uMaxDepth;
uniform float uAbsorption;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;

uniform vec3  uCameraPos;
uniform float uNear;
uniform float uFar;
