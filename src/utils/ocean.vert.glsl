// ============================================================
//  OCEAN VERTEX SHADER
// ============================================================

// Uniforms injectés côté JS
uniform float uTime;
uniform float uWaveHeight;       // amplitude globale (ex: 0.8)
uniform vec2  uWaveDirection;    // direction principale (ex: vec2(1.0, 0.3))

// Varyings → fragment shader
varying vec3  vWorldPosition;    // position monde du vertex
varying vec3  vViewDir;          // direction vers la caméra (non normalisée)
varying vec3  vNormal;           // normale monde (perturbée par les vagues)
varying vec2  vUv;
varying float vElevation;        // hauteur locale de la vague (pour la couleur de crête)

// ── Utilitaires bruit ────────────────────────────────────────

// Hash sans sin — plus stable sur GPU
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Gradient noise (Perlin-like)
float gradientNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep

    return mix(
        mix(dot(hash2(i + vec2(0,0)), f - vec2(0,0)),
            dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
        mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
            dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x),
        u.y
    );
}

// ── Gerstner Wave ────────────────────────────────────────────
// Modèle physiquement plus correct que sin simple :
// les crêtes sont pointues, les creux plats.
//   Q     : raideur (0 = sinus, 1 = cycloïde)
//   amp   : amplitude
//   freq  : fréquence spatiale
//   speed : vitesse de phase
//   dir   : direction normalisée

vec3 gerstnerWave(
    vec3 pos,
    vec2 dir,
    float amp,
    float freq,
    float speed,
    float Q
) {
    float phi   = freq * dot(dir, pos.xz) + speed * uTime;
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);

    return vec3(
        Q * amp * dir.x * cosPhi,   // déplacement X
        amp * sinPhi,               // déplacement Y (hauteur)
        Q * amp * dir.y * cosPhi    // déplacement Z
    );
}

// Dérivée du Gerstner → contribution à la normale
vec3 gerstnerNormal(
    vec3 pos,
    vec2 dir,
    float amp,
    float freq,
    float speed,
    float Q
) {
    float phi    = freq * dot(dir, pos.xz) + speed * uTime;
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);
    float WA     = freq * amp;

    return vec3(
        -dir.x * WA * cosPhi,
        -Q * WA * sinPhi,
        -dir.y * WA * cosPhi
    );
}

// ── Main ─────────────────────────────────────────────────────

void main() {
    vUv = uv;

    vec3 pos = position;

    // ── Superposition de 4 vagues de Gerstner ────────────────
    //    (direction, amplitude, fréquence, vitesse, raideur)
    //    Ajuste les params pour ton océan.

    vec3 disp  = vec3(0.0);
    vec3 nAccum = vec3(0.0);

    // Vague 1 — longue, lente, principale
    vec2 d1 = normalize(uWaveDirection);
    disp   += gerstnerWave(pos, d1, uWaveHeight * 1.0, 0.15, 0.8, 0.5);
    nAccum += gerstnerNormal(pos, d1, uWaveHeight * 1.0, 0.15, 0.8, 0.5);

    // Vague 2 — légèrement croisée
    vec2 d2 = normalize(uWaveDirection + vec2(0.3, 0.1));
    disp   += gerstnerWave(pos, d2, uWaveHeight * 0.5, 0.25, 1.1, 0.4);
    nAccum += gerstnerNormal(pos, d2, uWaveHeight * 0.5, 0.25, 1.1, 0.4);

    // Vague 3 — courte, rapide, texture de surface
    vec2 d3 = normalize(vec2(-0.5, 1.0));
    disp   += gerstnerWave(pos, d3, uWaveHeight * 0.2, 0.6, 2.0, 0.3);
    nAccum += gerstnerNormal(pos, d3, uWaveHeight * 0.2, 0.6, 2.0, 0.3);

    // Vague 4 — micro ride (capillaire)
    vec2 d4 = normalize(vec2(0.7, -0.3));
    disp   += gerstnerWave(pos, d4, uWaveHeight * 0.08, 1.5, 3.5, 0.2);
    nAccum += gerstnerNormal(pos, d4, uWaveHeight * 0.08, 1.5, 3.5, 0.2);

    // Bruit de détail superposé (rides de surface)
    float noise = gradientNoise(pos.xz * 0.4 + uTime * 0.15) * 0.12
                + gradientNoise(pos.xz * 1.2 - uTime * 0.08) * 0.04;
    disp.y += noise * uWaveHeight;

    // Position finale
    pos += disp;
    vElevation = disp.y; // hauteur locale pour la couleur de crête

    // Normale monde
    vec3 rawNormal = normalize(vec3(0.0, 1.0, 0.0) + nAccum);
    vNormal = normalize((modelMatrix * vec4(rawNormal, 0.0)).xyz);

    // Position monde
    vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos4.xyz;

    // Direction vue
    vViewDir = cameraPosition - vWorldPosition;

    gl_Position = projectionMatrix * viewMatrix * worldPos4;
}
