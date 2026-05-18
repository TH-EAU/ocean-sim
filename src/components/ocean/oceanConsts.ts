import * as THREE from "three"
import type { WaveLayer } from "@customTypes/wave";

export const MAX_WAVES = 8;
export const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
export const DEFAULT_SUN_DIR: [number, number, number] = [100, -5, 100];

// --- Wave physics constants ---
export const BASE_STEEPNESS = 0.6;   // Q clamp target
export const SPEED_SCALE = 4.5;   // omega = SPEED_SCALE * A * k

// --- Secondary noise envelope ---
export const SEC_NOISE_SCALE = 0.52;
export const SEC_NOISE_STRENGTH = 1.7;

// --- Default wave layers (can be overridden via Ocean's waveLayers prop) ---
// amplitude × disturbtion = actual amplitude at the given sea state
// wavelength × disturbtion = actual wavelength at the given sea state
// dirAngle = offset from wind direction (radians)
export interface OceanLOD {
    baseTileSize: number;
    gridRadius: number;
    levels: number[];
}

export const DEFAULT_LOD: OceanLOD = {
    baseTileSize: 200,
    gridRadius: 5,
    levels: [512, 512, 128, 32, 1],
};

export const DEFAULT_WAVE_LAYERS: WaveLayer[] = [
    { dirAngle: 0, amplitude: 1.7, wavelength: 80.0, steepness: 5, warpStrength: 0.1 },                              // carrier principal
    { dirAngle: 0.21, amplitude: 0.5, wavelength: 50.0, steepness: 2.8, warpStrength: 3, warpSize: 0.02 },                              // opposition
    { dirAngle: 0.35, amplitude: 0.6, wavelength: 70.0 },
    { dirAngle: Math.PI + .5, amplitude: 0.6, wavelength: 80.0, warpStrength: 5 },                              // traversière
    { dirAngle: Math.PI / 4, amplitude: 0.15, wavelength: 38.0, isSecondary: true },            // houle secondaire
    { dirAngle: -Math.PI / 5, amplitude: 0.10, wavelength: 15.0, isSecondary: true },            // ride secondaire
    { dirAngle: .2, amplitude: 0.10, wavelength: 5.0, isSecondary: true, warpStrength: 2 },
];
