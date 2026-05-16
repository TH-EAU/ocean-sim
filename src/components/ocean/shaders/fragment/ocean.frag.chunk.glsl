// // Volume absorption
// vec2 screenUV = gl_FragCoord.xy / uResolution;
// float sceneRawDepth = texture2D(uDepthTexture, screenUV).r;
// float sceneLinear = linearizeDepth(sceneRawDepth);
// float fragLinear = linearizeDepth(gl_FragCoord.z);
// float depthDiff = sceneLinear - fragLinear;
// float t = clamp(depthDiff / uDepthScale, 0.0, 1.0);
// float edgeFade = smoothstep(0.0, uDepthFade, depthDiff);
// vec4 water = waterGradient(t);

// // Réflexion planaire déformée par la normale du vertex shader
// vec2 reflUV = vec2(screenUV.x, 1.0 - screenUV.y) - vOceanNormal.xy * uReflectionStrength;
// vec3 reflection = texture2D(uSceneColor, reflUV).rgb;

// // Normal en world space (rotation mesh -PI/2 autour X)
// vec3 worldNormal = normalize(vec3(vOceanNormal.x, vOceanNormal.z, -vOceanNormal.y));

// // Vecteur vue
// vec3 V = normalize(cameraPosition - vOceanWorldPos);

// // Fresnel
// float NdotV   = clamp(dot(worldNormal, V), 0.0, 1.0);
// float fresnel  = pow(1.0 - NdotV, uFresnelPower);

// // Ciel reflété
// vec3 sky = vec3(1.0);

// // Specular solaire exponentielle
// vec3  sunDir   = normalize(uSunDirection);
// vec3  H        = normalize(V + sunDir);
// float spec     = pow(max(0.0, dot(worldNormal, H)), uSpecularPower);
// vec3  sunGlint = vec3(1.0, 0.95, 0.8) * spec * uSpecularIntensity;

// // Composition finale
// vec3 baseColor  = mix(water.rgb, reflection, uReflectionBlend);
// vec3 finalColor = mix(baseColor, sky, fresnel) + sunGlint * fresnel;
// float alpha = mix(water.a * edgeFade, 1.0, fresnel);

// vec3 h = texture2D(uHeightmap, uTerrainHeight).r;

vec2 screenUV = gl_FragCoord.xy / uResolution;

// Longueur du rayon à travers l'eau (depth pre-pass = scène sans océan)
float rawSceneDepth = texture2D(uDepthTexture, screenUV).r;
float sceneLinear = linearizeDepth(rawSceneDepth);
float fragLinear = linearizeDepth(gl_FragCoord.z);
float rayPathLength = max(0.0, sceneLinear - fragLinear);

// Correction Pythagore : projeter sur l'axe vertical
// → profondeur indépendante de la rotation caméra
vec3 cameraToSurface = vOceanWorldPos - cameraPosition;
float cosTheta = abs(cameraToSurface.y) / length(cameraToSurface);
float verticalDepth = rayPathLength * cosTheta;

float t = clamp(verticalDepth / uDepthScale, 0.0, 1.0);
vec4 water = waterGradient(t);

// Fresnel : normal world-space (mesh tourné -PI/2 autour X)
vec3 worldNormal = normalize(vec3(vOceanNormal.x, vOceanNormal.z, -vOceanNormal.y));
vec3 V = normalize(cameraPosition - vOceanWorldPos);
float fresnel = pow(1.0 - clamp(dot(worldNormal, V), 0.0, 1.0), uFresnelPower);
vec3 sky = skyColor(reflect(-V, worldNormal));

diffuseColor = vec4(mix(water.rgb, sky, fresnel), mix(water.a, 1.0, fresnel));