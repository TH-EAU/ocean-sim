// fragmentShader.glsl

uniform sampler2D uDepthTexture;
uniform vec2 uResolution;          // drawing buffer (px * dpr)
uniform mat4 uProjectionMatrixInverse;
uniform mat4 uViewMatrixInverse;
uniform vec3 uAbsorptionColor;
uniform float uDensity;
uniform float uMaxThickness;
uniform vec3 uScatterColor;
uniform float uScatterStrength;

vec3 reconstructWorldPos(vec2 uv, float depth) {
    vec3 ndc = vec3(uv * 2.0 - 1.0, depth * 2.0 - 1.0);
    vec4 viewPos = uProjectionMatrixInverse * vec4(ndc, 1.0);
    viewPos /= viewPos.w;
    vec4 worldPos = uViewMatrixInverse * viewPos;
    return worldPos.xyz;
}

void main() {
    // ── Fix décalage : gl_FragCoord est en pixels drawing buffer ──
    vec2 screenUV = gl_FragCoord.xy / uResolution;

    // Face avant du volume
    float frontDepth = gl_FragCoord.z;
    vec3 frontWorld = reconstructWorldPos(screenUV, frontDepth * 0.5 + 0.5);

    // Fond de scène depuis la depth texture
    float sceneDepth = texture2D(uDepthTexture, screenUV).r;
    vec3 sceneWorld = reconstructWorldPos(screenUV, sceneDepth);

    // Épaisseur traversée (clampée pour éviter les artefacts ciel)
    float thickness = clamp(length(sceneWorld - frontWorld), 0.0, uMaxThickness);

    // Beer-Lambert : T(λ) = exp(−σ_a(λ) · d)
    vec3 sigma_a = (1.0 - uAbsorptionColor) * uDensity;
    vec3 transmittance = exp(-sigma_a * thickness);

    // In-scattering optionnel
    float scatterDepth = 1.0 - exp(-uDensity * thickness);
    vec3 scattered = uScatterColor * uScatterStrength * scatterDepth;

    vec3 color = transmittance + scattered;
    float alpha = 1.0 - min(transmittance.r, min(transmittance.g, transmittance.b));

    gl_FragColor = vec4(color, alpha);
}