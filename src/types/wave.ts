export interface WaveLayer {
    dirAngle: number;       // angle offset FROM wind direction (radians)
    amplitude: number;      // amplitude scale at disturbtion = 1.0 → actual = amplitude * d
    wavelength: number;     // wavelength scale at disturbtion = 1.0 → actual = wavelength * d
    steepness?: number;     // Q override [0, 1], defaults to BASE_STEEPNESS
    isSecondary?: boolean;  // applies noise envelope, defaults to false
    warpStrength?: number;  // sinusoidal domain warp amplitude (0 = disabled)
    warpSize?: number;      // spatial frequency of the warp sine (default 0.17)
}
