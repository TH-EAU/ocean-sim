uniform float uTerrainHeight;
void main() {

    // vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
    // vec2 xz = worldBase.xz;

    // vec2 hUV = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
    // float h = texture(uHeightmap, hUV).r;

    vec3 absorbtionCoeff = vec3(0.2, 0.2, 0.2);

    float waterlvl = 1.0;
    float depth = waterlvl - uTerrainHeight;
    depth = max(0.0, depth);
    vec3 attenuation = exp((-absorbtionCoeff * depth));
    vec3 baseColor = vec3(0.0, 0.3, 0.6);
    vec3 finalColor = mix(baseColor, (vec3(0.0, 0.0, 0.0) * attenuation), 0.7);

    gl_FragColor = vec4(finalColor, 0.1);
}