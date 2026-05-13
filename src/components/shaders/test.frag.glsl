// test.frag.glsl


  // 1. Récupération de la profondeur de la scène
  float sceneDepth = texture2D(uDepthTexture, vScreenUV).r;
  float sceneViewZ = linearizeDepth(sceneDepth);

  // 2. Calcul de la distance derrière la plane
  float distanceBehind = sceneViewZ - vPlaneViewZ;

  // Early Exit : Si rien derrière, on ne fait rien
  if (distanceBehind <= 0.0) {
    return;
  }

  // 3. Intensité de base (basée sur la distance)
  float clampedDistance = min(distanceBehind, uMaxDistance);
  float baseIntensity = clampedDistance / uMaxDistance;

  // 4. Calcul du Fresnel
  // vFresnelDot est entre -1 (dos) et 1 (face). 
  // On s'intéresse surtout à la face (0 à 1).
  // On inverse : 1.0 - dot donne 0.0 (face) à 1.0 (bord rasant)
  float fresnelRaw = 1.0 - vFresnelDot;
  
  // On applique une puissance pour accentuer le bord (Schlick approximation simplifiée)
  // Power 2.0 = doux, 5.0 = très net
  float fresnelFactor = pow(fresnelRaw, 2.0);

  // 5. Combinaison Finale
  // On veut que le Fresnel renforce l'effet aux bords.
  // Option : On mélange l'intensité de base avec une valeur maximale (1.0) selon le Fresnel.
  // Plus le Fresnel est fort (bord), plus on s'approche de 1.0 (noir total ou alpha max).
  float finalIntensity = mix(baseIntensity, 1.0, fresnelFactor * 0.8); // 0.8 = force du Fresnel

  // 6. Application du Gradient d'Eau
  vec4 gradient = waterGradient(finalIntensity);

  // 7. Application sur le matériau
  diffuseColor.rgb *= gradient.rgb;
  diffuseColor.a = gradient.a;
