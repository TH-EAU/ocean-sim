vec3 pos = position;

vec2 worldPos = vec2(pos.x, pos.y) + uTileOffset;

vec2 dir = normalize(uCurrentDir);
float phase = dot(worldPos, dir) * 1.5 + uTime * uCurrentSpeed;
float wave = sin(phase) * uWaveAmplitude;
pos.z += wave;

#ifdef OCEAN_USE_NORMALS
float eps = 0.1;
float waveX = sin(dot(worldPos + vec2(eps, 0.0), dir) * 1.5 + uTime * uCurrentSpeed) * uWaveAmplitude;
float waveY = sin(dot(worldPos + vec2(0.0, eps), dir) * 1.5 + uTime * uCurrentSpeed) * uWaveAmplitude;
vec3 tangentX = normalize(vec3(eps, 0.0, waveX - wave));
vec3 tangentY = normalize(vec3(0.0, eps, waveY - wave));
objectNormal = normalize(cross(tangentX, tangentY));
vOceanNormal = objectNormal;
#endif

transformed = pos;
vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
