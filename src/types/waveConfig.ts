export interface GerstnerWave {
    direction: [number, number];
    amplitude: number;
    wavelength: number;
    steepness: number;
    speed: number;
}

export interface WaveGenConfig {
    count: number;
    baseAmplitude: number;
    baseWavelength: number;
    baseDirection: number; // radians
    baseSpeed: number;
    // "Sable" — deux paramètres principaux
    spread: number;        // variance directionnelle [0..PI] — le plus impactant visuellement
    chaos: number;         // variance amplitude/wavelength/speed [0..1]
    seed?: number;
}