vec2 worldXZ = (modelMatrix * vec4(position, 1.0)).xz;

const float WAVE_STEEPNESS = 0.5;
const float WAVE_SPEED = 1.2;

float amplitude = uDisturbtion * 1.5;
float wavelength = max(uDisturbtion * 50.0, 0.5);
float k = 2.0 * PI / wavelength;
float omega = WAVE_SPEED * sqrt(9.81 * k);

GerstnerOut g = gerstnerWave(worldXZ, uCurrentDirection, amplitude, k, WAVE_STEEPNESS, omega, uTime);

// world (dx, dy_up, dz) → local (dx, -dz, dy_up) — mesh tourné -PI/2 autour de X
vec3 pos = position;
pos.x += g.disp.x;
pos.y -= g.disp.z;
pos.z += g.disp.y;

#ifdef OCEAN_USE_NORMALS
vec3 worldN = normalize(vec3(g.normalDelta.x, 1.0 + g.normalDelta.y, g.normalDelta.z));
objectNormal = normalize(vec3(worldN.x, - worldN.z, worldN.y));
vOceanNormal = objectNormal;
#endif

transformed = pos;
vOceanWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
