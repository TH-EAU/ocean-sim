float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i),                  hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

struct GerstnerOut {
    vec3 disp;        // world-space displacement: (dx, dy_up, dz)
    vec3 normalDelta; // normal accumulator (sum before adding base vec3(0,1,0))
};

GerstnerOut gerstnerWave(vec2 xz, vec2 dir, float A, float k, float Q, float omega, float t) {
    dir = normalize(dir);
    float phi = k * dot(dir, xz) - omega * t;
    float cosp = cos(phi);
    float sinp = sin(phi);

    GerstnerOut o;
    o.disp = vec3(Q * A * dir.x * cosp,
                  A * sinp,
                  Q * A * dir.y * cosp);
    o.normalDelta = vec3(-dir.x * k * A * cosp, -Q * k * A * sinp, -dir.y * k * A * cosp);
    return o;
}
