float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbmDetail(vec2 p) {
    float v = 0.0, a = 0.5, f = 1.0;
    for (int k = 0; k < 3; k++) {
        v += a * valueNoise(p * f);
        a *= 0.5;
        f *= 2.0;
    }
    return v * 2.0 - 1.0;
}

vec2 warpedXZ(int i, vec2 xz) {
    float ws = uWaveWarpStrengths[i];
    return xz + vec2(
            sin(xz.y * 0.17 + uTime * 0.031) * ws,
            sin(xz.x * 0.23 + uTime * 0.024) * ws
        );
}
