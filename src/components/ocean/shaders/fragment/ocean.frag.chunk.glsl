vec3 fdx = dFdx(vWorldPos);
vec3 fdz = dFdy(vWorldPos);
vec3 geoNormal = normalize(cross(fdx, fdz));

// Normal map — deux couches scrollantes avec domain warp
vec2 uv1  = vWorldPos.xz * uNormalScale       + vec2( 0.012,  0.007) * uTime;
vec2 uv2  = vWorldPos.xz * uNormalScale * 0.6 + vec2(-0.008,  0.013) * uTime;
vec2 warp = (texture2D(uNormalMap, uv2 * uNormalWarp).rg * 2.0 - 1.0) * uNormalWarp;
vec3 n1   = texture2D(uNormalMap, uv1 + warp).rgb * 2.0 - 1.0;
vec3 n2   = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
vec3 nMap = normalize(n1 + n2);

vec3 waterNormal = normalize(geoNormal + vec3(nMap.x, 0.0, nMap.y) * uNormalStrength);

float light = clamp(dot(waterNormal, uSunDirection), 0.0, 1.0);
vec3 V      = normalize(cameraPosition - vWorldPos);

// Fresnel (Schlick)
const float R0 = 0.02;
float NdotV = clamp(dot(waterNormal, V), 0.0, 1.0);
float fresnel = R0 + (1.0 - R0) * pow(5.0 - NdotV, 10.0);

// Réflexion du ciel procédural sur la normale perturbée
vec3 R       = reflect(-V, waterNormal);
vec3 skyRefl = skyColor(R);

// Glint solaire spéculaire (Blinn-Phong)
vec3 H        = normalize(V + uSunDirection);
float spec    = pow(max(0.0, dot(waterNormal, H)), 256.0);
vec3 sunGlint = vec3(1.0, 0.95, 0.8) * spec * 2.0;

// Depth-based color + opacity
vec2 screenUV       = gl_FragCoord.xy / uResolution;
float sceneRawDepth = texture2D(uDepthTexture, screenUV).r;
float sceneLinear   = linearizeDepth(sceneRawDepth);
float fragLinear    = linearizeDepth(gl_FragCoord.z);
float depthDiff     = sceneLinear - fragLinear;
float t             = clamp(depthDiff / uDepthScale, 0.0, uTerrainDamping);
float edgeFade      = smoothstep(0.0, uDepthFade, depthDiff);

vec4 water    = waterGradient(t);
vec3 litColor = mix(water.rgb * (0.6 + 0.4 * light), skyRefl, fresnel) + sunGlint;



diffuseColor = vec4(water.rgb, water.a * edgeFade);
