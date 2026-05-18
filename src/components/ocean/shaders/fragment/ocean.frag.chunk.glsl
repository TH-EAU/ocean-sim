// vec2 screenUV = gl_FragCoord.xy / uResolution;

// // Longueur du rayon à travers l'eau (depth pre-pass = scène sans océan)
// float rawSceneDepth = texture2D(uDepthTexture, screenUV).r;
// float sceneLinear = linearizeDepth(rawSceneDepth);
// float fragLinear = linearizeDepth(gl_FragCoord.z);
// float rayPathLength = max(0.0, sceneLinear - fragLinear);

// // Correction Pythagore : projeter sur l'axe vertical
// // → profondeur indépendante de la rotation caméra
// vec3 cameraToSurface = vOceanWorldPos - cameraPosition;
// float cosTheta = abs(cameraToSurface.y) / length(cameraToSurface);
// float verticalDepth = rayPathLength * cosTheta;

// float t = clamp(verticalDepth / uDepthScale, 0.0, 1.0);
// vec4 water = waterGradient(t);

// // Fresnel : normal world-space (mesh tourné -PI/2 autour X)
// vec3 worldNormal = normalize(vec3(vOceanNormal.x, vOceanNormal.z, -vOceanNormal.y));
// vec3 V = normalize(cameraPosition - vOceanWorldPos);
// float fresnel = pow(1.0 - clamp(dot(worldNormal, V), 0.0, 1.0), uFresnelPower);
// vec3 sky = skyColor(reflect(-V, worldNormal));

// diffuseColor = vec4(mix(water.rgb, sky, fresnel), mix(water.a, 1.0, fresnel));

// diffuseColor = vec4(0.0, 1.0, 1.0, 1.0)