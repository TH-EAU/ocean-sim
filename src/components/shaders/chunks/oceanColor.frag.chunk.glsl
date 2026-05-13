vec3 fdx = dFdx(vWorldPos);
vec3 fdz = dFdy(vWorldPos);
vec3 waterNormal = normalize(cross(fdx, fdz));
const float R0 = 0.02;

float light = clamp(dot(waterNormal, uSunDirection), 0.0, 1.0);

vec3 V = normalize(cameraPosition - vWorldPos);

// ── Fresnel (Schlick) ────────────────────────────────────────
float NdotV = clamp(dot(waterNormal, V), 0.0, 1.0);
float fresnel = R0 + (1.0 - R0) * pow(1.0 - NdotV, 5.0);

vec3 reflected = vec3(1.0, 1.0, 1.0);
diffuseColor = vec4(mix(mix(vec3(0.0, 0.2, 0.4), vec3(0.0, 0.5, 0.8), light), reflected, fresnel), 1.0);
