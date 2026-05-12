export interface Ocean {
  carrierWaves?: WaveLayer[];
  secondaryWaves?: WaveLayer[];
  modulationStrength?: number;
  secondaryNoiseScale?: number;
  secondaryNoiseStrength?: number;
  detailFBmScale?: number;
  detailFBmStrength?: number;
  detailFBmSpeed?: number;
  depthScale?: number;
  fresnelPower?: number;
  fresnelStrength?: number;
}
