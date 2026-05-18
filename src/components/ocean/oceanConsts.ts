import * as THREE from "three"
import type { OceanLOD } from "@/src/types/lod";
import { buildChunks } from "./oceanUtils/lod";
import type { GerstnerWave } from "@/src/types/waveConfig";

export const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);

export const SUN_DIR: [number, number, number] = [100, 10, 100];

// LOD
export const LOD: OceanLOD = {
    baseTileSize: 200,
    gridRadius: 5,
    levels: [512, 512, 128, 32, 1],
};
export const LodDowngradeQualityTreshold = 3

export const CHUNKS = buildChunks()

// Waves

export const WAVE_LAYERS: GerstnerWave[] = [
    {
        direction: [1, 1],
        amplitude: .002,
        wavelength: 200,
        steepness: .5,
        speed: .02,
    },
    {
        direction: [1, 2],
        amplitude: .003,
        wavelength: 210,
        steepness: .5,
        speed: .02,
    }
    // { dirAngle: 0, amplitude: 2.7, wavelength: 50.0, steepness: 50, warpStrength: 0.1 },                              // carrier principal
    //{ dirAngle: 0.21, amplitude: 0.5, wavelength: 450.0, steepness: 28, warpStrength: 3, warpSize: 0.02 },                              // opposition
    //{ dirAngle: 0.35, amplitude: 0.6, wavelength: 170.0 },
    // { dirAngle: Math.PI + .5, amplitude: 0.6, wavelength: 80.0, warpStrength: 5 },                              // traversière
    // { dirAngle: Math.PI / 4, amplitude: 0.15, wavelength: 38.0, isSecondary: true },            // houle secondaire
    // { dirAngle: -Math.PI / 5, amplitude: 0.10, wavelength: 15.0, isSecondary: true },            // ride secondaire
    // { dirAngle: .2, amplitude: 0.10, wavelength: 5.0, isSecondary: true, warpStrength: 2 },
];

export const MAX_WAVES = WAVE_LAYERS.length;


// --- Default wave layers (can be overridden via Ocean's waveLayers prop) ---
// amplitude × disturbtion = actual amplitude at the given sea state 
// wavelength × disturbtion = actual wavelength at the given sea state
// dirAngle = offset from wind direction (radians)
