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
    o.disp = vec3(Q * A * dir.x * cosp,   // world X (horizontal)
    A * sinp,               // world Y (vertical, up)
    Q * A * dir.y * cosp    // world Z (horizontal)
    );
    o.normalDelta = vec3(-dir.x * k * A * cosp, -Q * k * A * sinp, -dir.y * k * A * cosp);
    return o;
}
