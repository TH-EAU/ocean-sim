
// Échantillonner la depth texture
float sceneDepth = texture2D(uDepthTexture, vScreenUV).r;

// Linéariser pour obtenir la distance view space
float sceneViewZ = linearizeDepth(sceneDepth);

// Calculer la distance des objets DERRIÈRE la plane
// Les deux sont maintenant en view space
float distanceBehind = sceneViewZ - vPlaneViewZ;

// OPTIMISATION : Early Exit
if (distanceBehind <= 0.0) {
  // Rien derrière, pas de modification
} else {
  // Appliquer la limite maximale
  float clampedDistance = min(distanceBehind, uMaxDistance);
  
  // Normaliser (0.0 à 1.0)
  float intensity = clampedDistance / uMaxDistance;
  
  // Appliquer la couleur (Blanc -> Noir)
  vec3 fogColor = mix(vec3(1.0), vec3(0.0), intensity);
  
  // Application sur la couleur diffuse
  diffuseColor.rgb *= fogColor;
}