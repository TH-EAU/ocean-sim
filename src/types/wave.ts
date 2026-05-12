export interface WaveLayer {
  direction:    [number, number]; // XZ, need not be normalized
  amplitude:    number;           // A — crest height in metres
  steepness:    number;           // Q — [0, 1/(w*A)]
  wavelength:   number;           // L — metres
  speed:        number;           // multiplier on physical phase speed (1.0 = realistic)
  warpStrength?: number;          // world units of domain warp (0 = none, default 0)
}
