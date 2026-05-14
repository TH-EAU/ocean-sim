vec2 screenUV = vScreenUV;

float sceneRaw = texture(uSceneDepth, screenUV).r;
vec3  ndc      = vec3(screenUV * 2.0 - 1.0, sceneRaw * 2.0 - 1.0);
vec4  exitPos  = uInvProjView * vec4(ndc, 1.0);
exitPos /= exitPos.w;

float waterColumnDepth = max(0.0, vWorldPos.y - exitPos.y);

vec3  rayDir    = normalize(vWorldPos - uCameraPos);
float rayLength = max(0.0, dot(exitPos.xyz - vWorldPos, rayDir));

float depth01    = clamp(waterColumnDepth / uMaxDepth, 0.0, 1.0);
vec3  waterColor = mix(uShallowColor, uDeepColor, depth01);
float absorption = exp(-rayLength * uAbsorption);

diffuseColor.rgb = mix(waterColor, diffuseColor.rgb, absorption);
diffuseColor.a   = smoothstep(0.0, uDepthFade, waterColumnDepth) * (1.0 - absorption);
