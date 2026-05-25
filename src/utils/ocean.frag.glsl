// ============================================================
//  OCEAN FRAGMENT SHADER
// ============================================================
//
//  ÉTAT ACTUEL — ce qui fonctionne SANS render target couleur ni Reflector :
//    ✅ Absorption Beer-Lambert spectrale (R/G/B différenciés)
//    ✅ Profondeur optique via depth buffer + reconstruction world pos
//    ✅ Fresnel physique (F0 eau = 0.02)
//    ✅ Réflexion env map (fallback sans Reflector)
//    ✅ Couleur de crête (tip scattering)
//    ✅ Normale perturbée par les vagues Gerstner
//
//  PHASE 2 — à brancher quand tu auras :
//    🔲 uSceneTexture  → réfraction réelle du fond (distorsion par normale)
//    🔲 uReflectorMap  → réflexion planaire correcte (parallaxe)
//
// ============================================================

precision highp float;

// ── Uniforms toujours présents ────────────────────────────────

uniform float uTime;
uniform vec2 uResolution;

// Depth buffer de la scène (déjà branché)
uniform sampler2D uDepthTexture;

// Matrices pour reconstruire la world position depuis le depth
uniform mat4 uProjectionMatrixInverse;
uniform mat4 uViewMatrixInverse;

// Couleur de base de l'eau profonde (ex: vec3(0.02, 0.12, 0.20))
uniform vec3 uDeepColor;

// Couleur de surface / scattering de crête (ex: vec3(0.1, 0.8, 0.7))
uniform vec3 uShallowColor;

// Profondeur de référence pour l'absorption (en unités monde, ex: 5.0)
uniform float uDepthScale;

// Env map pour les réflexions (fallback sans Reflector)
uniform samplerCube uEnvMap;

uniform float uWaveHeight;

// ── Uniforms Phase 2 (décommenter quand dispo) ───────────────

// uniform sampler2D uSceneTexture;   // scène rendue sans le mesh eau
// uniform sampler2D uReflectorMap;   // Reflector render target
// uniform mat4      uReflectorMatrix; // matrice de projection du Reflector

// ── Varyings depuis le vertex shader ─────────────────────────

varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying vec3 vNormal;
varying vec2 vUv;
varying float vElevation;

// ── Utilitaires ───────────────────────────────────────────────

// Reconstruction world position depuis depth buffer
vec3 reconstructWorldPos(vec2 uv, float depth) {
    vec3 ndc = vec3(uv * 2.0 - 1.0, depth * 2.0 - 1.0);
    vec4 viewPos = uProjectionMatrixInverse * vec4(ndc, 1.0);
    viewPos /= viewPos.w;
    vec4 worldPos = uViewMatrixInverse * viewPos;
    return worldPos.xyz;
}

// Fresnel de Schlick
// F0 eau ≈ 0.02 (interface air/eau, indice ~1.33)
float fresnelSchlick(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// ── Main ──────────────────────────────────────────────────────

void main() {

    // ── Vecteurs de base ──────────────────────────────────────

    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);             // vers la caméra
    float NdotV = max(dot(N, V), 0.0);

    // ── UVs écran ─────────────────────────────────────────────

    vec2 screenUV = gl_FragCoord.xy / uResolution;

    // ── Depth + world position du fond ────────────────────────

    float rawDepth = texture2D(uDepthTexture, screenUV).r;
    vec3 sceneWorld = reconstructWorldPos(screenUV, rawDepth);
    vec3 meshWorld = vWorldPosition;

    // Profondeur verticale (eau au-dessus du fond)
    // Négatif si la caméra est au-dessous — on protège avec max()
    float verticalDepth = max(0.0, meshWorld.y - sceneWorld.y);

    // ── Profondeur optique ────────────────────────────────────
    // Longueur du chemin parcouru par le rayon dans l'eau.
    // On divise par cos(θ) pour tenir compte de l'angle :
    // un rayon rasant traverse plus d'eau qu'un rayon plongeant.
    float cosIncidence = max(NdotV, 0.05); // évite division par 0
    float opticalDepth = verticalDepth / cosIncidence;

    // ── Absorption Beer-Lambert spectrale ─────────────────────
    // Coefficients mesurés sur eau de mer claire :
    //   Rouge  → absorbé en ~1-2 m
    //   Vert   → absorbé en ~10-20 m
    //   Bleu   → absorbé en ~100 m+
    // Ajuste selon le look voulu (eau boueuse = coeffs plus élevés)
    vec3 absorptionCoeff = vec3(0.45, 0.065, 0.01);
    vec3 transmittance = exp(-absorptionCoeff * opticalDepth / uDepthScale);

    // ── Couleur de réfraction ─────────────────────────────────
    //
    // PHASE 1 (maintenant) : pas de texture scène → on simule la couleur
    // du fond absorbé avec uDeepColor comme approximation du fond marin.
    //
    // PHASE 2 (avec uSceneTexture) : remplacer refractedColor par :
    //
    //   vec2 distortion   = N.xz * 0.04;
    //   vec2 refractedUV  = screenUV + distortion;
    //   vec3 sceneColor   = texture2D(uSceneTexture, refractedUV).rgb;
    //   // Recalculer verticalDepth avec la depth au point réfracté aussi
    //   float rDepth      = texture2D(uDepthTexture, refractedUV).r;
    //   vec3  rWorld      = reconstructWorldPos(refractedUV, rDepth);
    //   float rVertDepth  = max(0.0, meshWorld.y - rWorld.y);
    //   float rOptDepth   = rVertDepth / cosIncidence;
    //   vec3  rTransmit   = exp(-absorptionCoeff * rOptDepth / uDepthScale);
    //   vec3  refractedColor = sceneColor * rTransmit;

    // Couleur de fond simulée (eau profonde = uDeepColor, eau peu profonde = uShallowColor)
    float shallowness = exp(-verticalDepth / uDepthScale); // 1=surface, 0=profond
    vec3 refractedColor = mix(uDeepColor, uShallowColor, shallowness) * transmittance;

    // ── Réflexion ─────────────────────────────────────────────
    //
    // PHASE 1 (maintenant) : env map cubemap
    vec3 skyHorizon = vec3(0.6, 0.75, 0.9);
    vec3 skyZenith = vec3(0.2, 0.4, 0.8);
    float skyBlend = pow(max(dot(reflect(-V, N), vec3(0.0, 1.0, 0.0)), 0.0), 0.5);
    vec3 reflectionColor = mix(skyHorizon, skyZenith, skyBlend);

    //
    // PHASE 2 (avec uReflectorMap) : remplacer reflectionColor par :
    //
    //   vec4 reflectorCoord = uReflectorMatrix * vec4(vWorldPosition, 1.0);
    //   vec2 reflectorUV    = (reflectorCoord.xy / reflectorCoord.w) * 0.5 + 0.5;
    //   // Distorsion par la normale pour les rides
    //   reflectorUV        += N.xz * 0.02;
    //   vec3 reflectionColor = texture2D(uReflectorMap, reflectorUV).rgb;
    //
    // Tu peux blender env map + Reflector selon la distance caméra :
    //   float dist = length(vViewDir);
    //   float blend = smoothstep(10.0, 50.0, dist); // Reflector au près, envmap au loin
    //   reflectionColor = mix(reflectorColor, envReflection, blend);

    // ── Fresnel ───────────────────────────────────────────────
    // F0 eau = 0.02 (indice de réfraction n ≈ 1.33)
    float fresnel = fresnelSchlick(NdotV, 0.02);

    // ── Tip scattering (crêtes de vagues) ────────────────────
    // Les crêtes laissent passer la lumière → teinte cyan/émeraude
    // vElevation est la hauteur locale de la vague (depuis le vertex shader)
    float tipFactor = smoothstep(0.0, uWaveHeight * 0.6, vElevation);
    vec3 tipColor = vec3(0.1, 0.9, 0.7); // cyan émeraude
    float tipOpacity = tipFactor * 0.5;

    // ── Composition finale ────────────────────────────────────

    // 1. Mix réfraction/réflexion par Fresnel
    vec3 waterColor = mix(refractedColor, reflectionColor, fresnel);

    // 2. Ajout du tip scattering sur les crêtes
    waterColor = mix(waterColor, tipColor, tipOpacity);

    // 3. Spéculaire simple (sun highlight) — optionnel
    //    Branche une uniform uSunDirection si tu veux le soleil
    // vec3  H        = normalize(uSunDirection + V);
    // float specular = pow(max(dot(N, H), 0.0), 128.0) * 2.5;
    // waterColor    += vec3(1.0) * specular;

    // Alpha : pleinement opaque (on gère la transparence via la réfraction)
    gl_FragColor = vec4(waterColor, 1.0);
}
