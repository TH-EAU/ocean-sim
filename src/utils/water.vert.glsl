// ─────────────────────────────────────────────────────────────────────────────
// gerstner.vert.glsl — Gerstner Wave vertex shader
//
// Uniforms attendus depuis ton composant :
//   uniform float uTime;
//   uniform float uAmplitude;   // hauteur des vagues   (ex: 0.15)
//   uniform float uSteepness;   // "pointiness" [0-1]   (ex: 0.5)
//   uniform float uWaveLength;  // longueur d'onde      (ex: 2.0)
//   uniform float uSpeed;       // vitesse de phase     (ex: 1.2)
//
// Varyings exposés au fragment :
//   varying vec3 vWorldNormal;   // normale déformée en world space (pour le fresnel)
//   varying vec3 vWorldPos;      // position déformée en world space
//   varying vec2 vUv;
// ─────────────────────────────────────────────────────────────────────────────

uniform float uTime;
uniform float uAmplitude;
uniform float uSteepness;
uniform float uWaveLength;
uniform float uSpeed;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

struct GerstnerWave {
    vec2 direction;
    float amplitude;
    float steepness;
    float wavelength;
    float speed;
};

vec3 gerstnerOffset(GerstnerWave w, vec3 pos, float time, inout vec3 tangent, inout vec3 binormal) {
    float k = 2.0 * 3.14159265 / w.wavelength;
    float c = sqrt(9.81 / k);
    float phase = k * dot(w.direction, pos.xz) - c * w.speed * time;
    float Q = w.steepness / (k * w.amplitude * 3.0);

    float cosP = cos(phase);
    float sinP = sin(phase);

    vec3 offset;
    offset.x = Q * w.amplitude * w.direction.x * cosP;
    offset.y = w.amplitude * sinP;
    offset.z = Q * w.amplitude * w.direction.y * cosP;

    float WA = k * w.amplitude;
    tangent += vec3(-Q * w.direction.x * w.direction.x * WA * sinP, Q * w.direction.x * WA * cosP, -Q * w.direction.x * w.direction.y * WA * sinP);
    binormal += vec3(-Q * w.direction.x * w.direction.y * WA * sinP, Q * w.direction.y * WA * cosP, -Q * w.direction.y * w.direction.y * WA * sinP);

    return offset;
}

void main() {
    vUv = uv;

    GerstnerWave w0;
    w0.direction = normalize(vec2(1.0, 0.0));
    w0.amplitude = uAmplitude;
    w0.steepness = uSteepness;
    w0.wavelength = uWaveLength;
    w0.speed = uSpeed;

    GerstnerWave w1;
    w1.direction = normalize(vec2(0.7, 0.4));
    w1.amplitude = uAmplitude * 0.6;
    w1.steepness = uSteepness * 0.8;
    w1.wavelength = uWaveLength * 0.7;
    w1.speed = uSpeed * 1.3;

    GerstnerWave w2;
    w2.direction = normalize(vec2(-0.3, 1.0));
    w2.amplitude = uAmplitude * 0.35;
    w2.steepness = uSteepness * 0.5;
    w2.wavelength = uWaveLength * 0.45;
    w2.speed = uSpeed * 1.7;

    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);

    vec3 pos = position;

    pos += gerstnerOffset(w0, position, uTime, tangent, binormal);
    pos += gerstnerOffset(w1, position, uTime, tangent, binormal);
    pos += gerstnerOffset(w2, position, uTime, tangent, binormal);

    vec3 localNormal = normalize(cross(binormal, tangent));

    vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}