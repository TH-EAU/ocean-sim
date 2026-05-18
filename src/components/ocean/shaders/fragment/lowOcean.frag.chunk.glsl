// vec4 water = waterGradient(1.0);

// vec3 worldNormal = normalize(vec3(vOceanNormal.x, vOceanNormal.z, -vOceanNormal.y));
// vec3 V = normalize(cameraPosition - vOceanWorldPos);
// float fresnel = pow(1.0 - clamp(dot(worldNormal, V), 0.0, 1.0), uFresnelPower);
// vec3 sky = skyColor(reflect(-V, worldNormal));

// diffuseColor = vec4(mix(water.rgb, sky, fresnel), mix(water.a, 1.0, fresnel));
