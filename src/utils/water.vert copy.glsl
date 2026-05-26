varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vElevation;

varying vec3 vViewDir;
uniform float uTime;

varying vec4 vScreenPos;
varying vec3 vNormal;

vec3 gerstnerWave(vec3 pos, vec2 dir, float amp, float freq, float speed, float Q) {
    float phi = freq * dot(dir, pos.xz) + speed * uTime; // XZ monde
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);
    return vec3(Q * amp * dir.x * cosPhi,  // déplacement X monde
    amp * sinPhi,               // déplacement Y monde (hauteur)
    Q * amp * dir.y * cosPhi   // déplacement Z monde
    );
}

vec3 gerstnerNormal(vec3 pos, vec2 dir, float amp, float freq, float speed, float Q) {
    float phi = freq * dot(dir, pos.xz) + speed * uTime;
    float sinPhi = sin(phi);
    float WA = freq * amp;
    return vec3(-dir.x * WA * sinPhi,  // perturbation X
    1.0,                    // Y dominant — haut en espace monde
    -dir.y * WA * sinPhi   // perturbation Z
    );
}

void main() {
    vUv = uv;
    vec3 pos = position;

    vec3 disp = vec3(0.0);
    vec3 nAccum = vec3(0.0, 0.0, 1.0); // normale de base = Z local (up avant rotation)

    vec2 d1 = normalize(vec2(1.0, 0.2));
    disp += gerstnerWave(pos, d1, 5.1, 0.055, 0.8, 2.5);
    nAccum += gerstnerNormal(pos, d1, 5.1, 0.055, 0.8, 2.5);

    pos += disp;
    vElevation = disp.z;

    vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos4.xyz;
    vViewDir = cameraPosition - vWorldPosition;
    vScreenPos = projectionMatrix * viewMatrix * worldPos4;

    // normale en espace monde — applique la rotation du modelMatrix
    vNormal = normalize(mat3(modelMatrix) * gerstnerNormal(pos, d1, 5.1, 0.055, 0.8, 2.5));

    gl_Position = vScreenPos;
}