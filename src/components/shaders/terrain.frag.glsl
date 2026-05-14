// ============================================================
// Fragment shader — heightmap terrain
// Blinn-Phong lighting + height-based colour bands
// ============================================================

varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform float uWaterLine;
uniform vec3 uFogColor;
uniform float uFogDensity;

const vec3 COLOR_SAND = vec3(0.76, 0.70, 0.50);
const vec3 COLOR_GRASS = vec3(0.22, 0.42, 0.16);
const vec3 COLOR_ROCK = vec3(0.42, 0.36, 0.27);
const vec3 COLOR_PEAK = vec3(0.58, 0.55, 0.52);

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    float y = vWorldPos.y - uWaterLine;

    vec3 baseColor;
    if(y < 0.3) {
        baseColor = mix(COLOR_SAND, COLOR_GRASS, smoothstep(0.1, 0.5, y));
    } else if(y < 2.5) {
        baseColor = mix(COLOR_GRASS, COLOR_ROCK, smoothstep(0.8, 2.5, y));
    } else {
        baseColor = mix(COLOR_ROCK, COLOR_PEAK, smoothstep(2.5, 5.0, y));
    }

    float steepness = 1.0 - clamp(N.y, 0.0, 1.0);
    baseColor = mix(baseColor, COLOR_ROCK, steepness * steepness * 0.7);

    float diff = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.1;

    vec3 color = uAmbientColor * baseColor + uLightColor * baseColor * diff + uLightColor * spec;

    gl_FragColor = vec4(color, 1.0);

    // // ── Exponential fog ───────────────────────────────────────────
    // float fogDist   = length(cameraPosition - vWorldPos);
    // float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * fogDist * fogDist);
    // gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, clamp(fogFactor, 0.0, 1.0));
}
