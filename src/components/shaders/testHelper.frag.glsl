// Formule standard Three.js pour linéariser la depth
float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

vec4 waterGradient(float t) {
    t = clamp(t, 0.0, 1.0);
    float s = t * 6.0;
    vec3 col; float alpha;
    if      (s < 1.0) { float f = s;       col = mix(vec3(0.361,0.867,0.690), vec3(0.047,0.855,0.765), f); alpha = mix(0.05, 0.15, f); }
    else if (s < 2.0) { float f = s - 1.0; col = mix(vec3(0.047,0.855,0.765), vec3(0.000,0.655,0.737), f); alpha = mix(0.15, 0.50, f); }
    else if (s < 3.0) { float f = s - 2.0; col = mix(vec3(0.000,0.655,0.737), vec3(0.000,0.471,0.600), f); alpha = mix(0.50, 0.90, f); }
    else if (s < 4.0) { float f = s - 3.0; col = mix(vec3(0.000,0.471,0.600), vec3(0.000,0.333,0.545), f); alpha = mix(0.90, 1.00, f); }
    else if (s < 5.0) { float f = s - 4.0; col = mix(vec3(0.000,0.333,0.545), vec3(0.000,0.243,0.486), f); alpha = 1.0; }
    else              { float f = s - 5.0; col = mix(vec3(0.000,0.243,0.486), vec3(0.000,0.208,0.408), f); alpha = 1.0; }
    return vec4(col, alpha);
}
