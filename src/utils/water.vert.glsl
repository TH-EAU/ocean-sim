varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vElevation;

varying vec3 vViewDir;

vec3 gerstnerWave(
    vec3 pos,
    vec2 dir,
    float amp,
    float freq,
    float speed,
    float Q
) {
    float phi = freq * dot(dir, pos.xy) + speed; // xy : plan local avant rotation
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);

    return vec3(Q * amp * dir.x * cosPhi,  // déplacement X local
    Q * amp * dir.y * cosPhi,  // déplacement Y local
    amp * sinPhi               // hauteur → Z local → devient Y monde
    );
}

vec3 gerstnerNormal(
    vec3 pos,
    vec2 dir,
    float amp,
    float freq,
    float speed,
    float Q
) {
    float phi = freq * dot(dir, pos.xy) + speed;
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);
    float WA = freq * amp;

    return vec3(-dir.x * WA * cosPhi, -dir.y * WA * cosPhi, -Q * WA * sinPhi           // normale en Z local
    );
}

void main() {
    vUv = uv;
    vec3 pos = position;

    vec3 disp = vec3(0.0);
    vec3 nAccum = vec3(0.0);

    vec2 d1 = normalize(vec2(1.0, 0.2));
    disp += gerstnerWave(pos, d1, 1.0, 0.15, 0.8, 5.5);
    nAccum += gerstnerNormal(pos, d1, 1.0, 0.15, 0.8, 5.5);

    pos += disp;
    vElevation = disp.z; // Z local = hauteur monde

    vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos4.xyz;
    vViewDir = cameraPosition - vWorldPosition;

    gl_Position = projectionMatrix * viewMatrix * worldPos4;
}