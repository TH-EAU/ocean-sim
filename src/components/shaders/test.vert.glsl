// Position écran pour échantillonner la depth texture
vec4 screenPosition = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
vScreenUV = screenPosition.xy / screenPosition.w * 0.5 + 0.5;

// Distance en view space (Z négatif devant la caméra)
vec3 viewPosition = (modelViewMatrix * vec4(transformed, 1.0)).xyz;
vPlaneViewZ = -viewPosition.z; // Positif pour la distance