import * as THREE from "three"
import type { WaveLayer } from "../../types/wave";

export const MAX_WAVES = 8;
export const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
export const DEFAULT_WIND_DIR: [number, number] = [-0.8, -0.8];
export const DEFAULT_SUN_DIR: [number, number, number] = [100, 10, 100];

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
export const DEFAULT_WAVE_LAYERS: WaveLayer[] = [
    { dirAngle: 0, amplitude: 1.7, wavelength: 80.0, steepness: 5, warpStrength: 0.1 },                              // carrier principal
    { dirAngle: 0.21, amplitude: 0.5, wavelength: 50.0, steepness: 2.8, warpStrength: 3, warpSize: 0.02 },                              // opposition
    { dirAngle: 0.35, amplitude: 0.6, wavelength: 70.0 },
    { dirAngle: Math.PI + .5, amplitude: 0.6, wavelength: 80.0, warpStrength: 5 },                              // traversière
    { dirAngle: Math.PI / 4, amplitude: 0.15, wavelength: 38.0, isSecondary: true },            // houle secondaire
    { dirAngle: -Math.PI / 5, amplitude: 0.10, wavelength: 15.0, isSecondary: true },            // ride secondaire
    { dirAngle: .2, amplitude: 0.10, wavelength: 5.0, isSecondary: true, warpStrength: 2 },
];

const makeSafeV4Array = () =>
    Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 0, 0, 1));

/** Compute per-wave shader uniforms from a WaveLayer array, disturbtion and wind angle.
 *  Carrier waves are those with isSecondary = false (listed first for the pre-pass). */
export function deriveWaves(
    layers: WaveLayer[],
    disturbtion: number,
    baseAngle: number,
): { dirAmp: THREE.Vector4[]; params: THREE.Vector4[]; extra: THREE.Vector4[]; numCarrier: number } {
    const d = Math.max(disturbtion, 0.001);
    let numCarrier = 0;
    const dirAmp = makeSafeV4Array();
    const params = makeSafeV4Array();
    const extra = makeSafeV4Array();

    layers.forEach((layer, i) => {
        if (i >= MAX_WAVES) return;

        const angle = baseAngle + layer.dirAngle;
        const A = layer.amplitude * d;
        const wl = Math.max(layer.wavelength * d, 0.1);
        const k = (2 * Math.PI) / wl;
        const Q = Math.min(layer.steepness ?? BASE_STEEPNESS, 0.8 / (k * A));
        const omega = SPEED_SCALE * A * k;
        const sec = layer.isSecondary ? 1 : 0;
        const ws = layer.warpStrength ?? 0;
        const warpFreq = layer.warpSize ?? 0.17;

        dirAmp[i].set(Math.cos(angle), Math.sin(angle), A, wl);
        params[i].set(Q, omega, sec, ws);
        extra[i].set(warpFreq, 0, 0, 0);

        if (!layer.isSecondary) numCarrier++;
    });

    return { dirAmp, params, extra, numCarrier };
}
