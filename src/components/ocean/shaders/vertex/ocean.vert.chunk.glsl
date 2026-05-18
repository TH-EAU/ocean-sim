// World position — garantit la continuité entre les chunks
vec2 worldXZ = (modelMatrix * vec4(position, 1.0)).xz;
vec3 worldPos3 = vec3(worldXZ.x, 0.0, worldXZ.y);

// Déplacement
vec3 displacement = gerstnerDisplacement(worldPos3, uTime);
vec3 pos = position + displacement;

// Normales
#ifdef OCEAN_USE_NORMALS
vOceanNormal = gerstnerNormal(worldPos3, uTime);
#endif

transformed = pos;
vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;