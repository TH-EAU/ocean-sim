// Formule standard Three.js pour linéariser la depth
float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}
