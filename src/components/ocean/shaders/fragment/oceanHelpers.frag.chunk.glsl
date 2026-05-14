float linearizeDepth(float raw) {
    float z = raw * 2.0 - 1.0;
    return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

vec3 skyColor(vec3 dir) {
    float up = max(dir.y, 0.0);
    vec3 zenith = vec3(0.08, 0.28, 0.75);
    vec3 horiz  = vec3(0.58, 0.75, 0.92);
    vec3 sky    = mix(horiz, zenith, smoothstep(0.0, 0.40, up));
    float sunAz = max(0.0, dot(normalize(dir), uSunDirection));
    float hGlow = (1.0 - smoothstep(0.0, 0.15, up)) * pow(sunAz, 3.0);
    sky = mix(sky, vec3(1.0, 0.65, 0.25), hGlow * 0.55);
    sky += vec3(1.0, 0.80, 0.45) * pow(max(0.0, sunAz), 8.0) * 0.45;
    sky += vec3(1.6, 1.3, 0.8) * smoothstep(0.9993, 1.0, dot(normalize(dir), uSunDirection));
    return sky;
}

vec4 waterGradient(float t) {
    t = clamp(t, 0.0, 1.0);
    float s = t * 6.0;
    vec3 col;
    float alpha;
    if(s < 1.0) {
        float f = s;
        col = mix(vec3(0.361, 0.867, 0.690), vec3(0.047, 0.855, 0.765), f);
        alpha = mix(0.05, 0.15, f);
    } else if(s < 2.0) {
        float f = s - 1.0;
        col = mix(vec3(0.047, 0.855, 0.765), vec3(0.000, 0.655, 0.737), f);
        alpha = mix(0.15, 0.50, f);
    } else if(s < 3.0) {
        float f = s - 2.0;
        col = mix(vec3(0.000, 0.655, 0.737), vec3(0.000, 0.471, 0.600), f);
        alpha = mix(0.50, 0.90, f);
    } else if(s < 4.0) {
        float f = s - 3.0;
        col = mix(vec3(0.000, 0.471, 0.600), vec3(0.000, 0.333, 0.545), f);
        alpha = mix(0.90, 1.00, f);
    } else if(s < 5.0) {
        float f = s - 4.0;
        col = mix(vec3(0.000, 0.333, 0.545), vec3(0.000, 0.243, 0.486), f);
        alpha = 1.0;
    } else {
        float f = s - 5.0;
        col = mix(vec3(0.000, 0.243, 0.486), vec3(0.000, 0.208, 0.408), f);
        alpha = 1.0;
    }
    return vec4(col, alpha);
}
