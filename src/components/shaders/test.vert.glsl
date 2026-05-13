// test.vert.glsl

// 1. Position écran pour la depth
vec4 screenPosition = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
vScreenUV = screenPosition.xy / screenPosition.w * 0.5 + 0.5;

// 2. Position et Normale en View Space
vec3 viewPosition = (modelViewMatrix * vec4(transformed, 1.0)).xyz;
vPlaneViewZ = -viewPosition.z; // Distance positive

// Normale en view space (transformée par la matrice modèle-vue)
vec3 viewNormal = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);

// 3. Vecteur de vue (depuis la surface vers la caméra, qui est à 0,0,0 en view space)
vec3 viewDir = normalize(-viewPosition);

// 4. Calcul du Fresnel de base (Cosinus de l'angle)
// 1.0 = face à la caméra, 0.0 = bord rasant
float fresnelDot = dot(viewNormal, viewDir);

// On passe le dot brut au fragment
vFresnelDot = fresnelDot;