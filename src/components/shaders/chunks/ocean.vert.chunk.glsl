vec3 worldBase = (modelMatrix * vec4(position, 1.0)).xyz;
vec2 xz = worldBase.xz;

vec2 hUV = clamp((xz - uTerrainBounds.xy) / (uTerrainBounds.zw - uTerrainBounds.xy), 0.0, 1.0);
float h = texture(uHeightmap, hUV).r;
float ampScale = 1.0 - h * uTerrainDamping;

vec2 envUV = xz * uSecondaryNoiseScale + vec2(uTime * 0.012, uTime * 0.007);
float envelope = valueNoise(envUV);
float secondaryEnvelope = 1.0 - uSecondaryNoiseStrength * (1.0 - envelope);

float warpFreq = uSecondaryNoiseScale * 0.7;
vec2 noiseWarp2D = vec2(
        valueNoise(xz * warpFreq + vec2(31.4, 92.6) + uTime * 0.008),
        valueNoise(xz * warpFreq + vec2(64.2, 17.8) + uTime * 0.006)
    ) * 2.0 - 1.0;

float carrierY = 0.0;
float carrierAmpSum = 0.0;
for ( int i = 0; i < MAX_WAVES; i ++ ) {
if ( i >= uNumCarrierWaves ) break ;
float A = uWaveAmplitudes[i] * ampScale;
if ( A < 0.0001 ) continue ;
vec2 D = normalize(uWaveDirections[i]);
float w = 6.28318 / uWaveWavelengths[i];
float spd = sqrt(9.81 / w) * uWaveSpeeds[i];
float phase = dot(D, warpedXZ(i, xz)) * w + uTime * spd;
carrierY += A * sin(phase);
carrierAmpSum += A;
}
float modFactor = 1.0;
if ( carrierAmpSum > 0.0 ) {
float t = carrierY / carrierAmpSum;
modFactor = max(0.0, 1.0+uModulationStrength*t);
}

vec3 displaced = worldBase;
vec3 ddx = vec3(1.0, 0.0, 0.0);
vec3 ddz = vec3(0.0, 0.0, 1.0);
float ampSum = 0.0;

for ( int i = 0; i < MAX_WAVES; i ++ ) {
float A = uWaveAmplitudes[i] * ampScale;
bool isSecondary = (i >= uNumCarrierWaves) && (i < uNumCarrierWaves + uNumSecondaryWaves);

if ( isSecondary ) A *= modFactor * secondaryEnvelope;
if ( A < 0.0001 ) continue ;

vec2 D = normalize(uWaveDirections[i]);
float Q = uWaveSteepnesses[i];
float L = uWaveWavelengths[i];
float w = 6.28318 / L;
float spd = sqrt(9.81 / w) * uWaveSpeeds[i];

vec2 xzW = isSecondary
    ? xz + noiseWarp2D * uWaveWarpStrengths[i] : warpedXZ(i, xz);

float phase = dot(D, xzW) * w + uTime * spd;
float sinP = sin(phase);
float cosP = cos(phase);

displaced . x += ( D . x / w ) * A * Q * cosP;
displaced . z += ( D . y / w ) * A * Q * cosP;
displaced . y += A * sinP;
ampSum += A;

ddx . x += - D . x * D . x * A * Q * w * sinP;
ddx . y += D . x * A * w * cosP;
ddx . z += - D . x * D . y * A * Q * w * sinP;

ddz . x += - D . x * D . y * A * Q * w * sinP;
ddz . y += D . y * A * w * cosP;
ddz . z += - D . y * D . y * A * Q * w * sinP;
}

vSelfShadow = ampSum > 0.0 ? clamp(displaced.y/ampSum, -1.0, 1.0): 0.0 ;

if ( uDetailFBmStrength > 0.0 ) {
vec2 detailUV = xz * uDetailFBmScale + uDetailWindDir * uTime * uDetailFBmSpeed;
displaced . y += uDetailFBmStrength * fbmDetail(detailUV);

const float EPS = 0.15;
vec2 dxUV = vec2(EPS * uDetailFBmScale, 0.0);
vec2 dzUV = vec2(0.0, EPS * uDetailFBmScale);
float dy_dx = (fbmDetail(detailUV + dxUV) - fbmDetail(detailUV - dxUV)) / (2.0 * EPS);
float dy_dz = (fbmDetail(detailUV + dzUV) - fbmDetail(detailUV - dzUV)) / (2.0 * EPS);
ddx . y += uDetailFBmStrength * dy_dx;
ddz . y += uDetailFBmStrength * dy_dz;
}

vNormal = normalize(cross(ddz, ddx));
vWorldPos = displaced;
vTerrainH = h;

// "transformed" est la variable attendue par le pipeline Three.js
// on repasse en local space pour project_vertex et shadowmap_vertex
vec3 transformed = (inverse(modelMatrix) * vec4(displaced, 1.0)).xyz;
