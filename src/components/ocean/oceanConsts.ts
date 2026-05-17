import * as THREE from "three"
import type { WaveLayer } from "../../types/wave";

export const MAX_WAVES = 8;
export const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
export const DEFAULT_WIND_DIR: [number, number] = [-0.8, -0.8];
export const DEFAULT_SUN_DIR: [number, number, number] = [100, 10, 100];
export const EMPTY_WAVES: WaveLayer[] = [];

// --- Gerstner wave derivation constants ---
// Reference amplitudes at disturbtion = 1.0
export const BASE_AMP_CARRIER   = 0.9;
export const BASE_AMP_OPP       = 0.3;
export const BASE_AMP_VAR       = 0.2;

// Reference wavelengths at disturbtion = 1.0
export const BASE_WL_CARRIER    = 20.0;

// Base steepness (Q) — auto-clamped below loop threshold
export const BASE_STEEPNESS     = 0.6;

// Warp strength per wave (applied to subsequent waves' sample position)
export const BASE_WARP_CARRIER  = 0.0;
export const BASE_WARP_OPP      = 0.3;
export const BASE_WARP_VAR      = 0.5;

// Speed = SPEED_SCALE * amplitude * k  (angular frequency)
// At disturbtion=0.5: carrier omega ≈ 1.27 rad/s → period ≈ 5s
export const SPEED_SCALE        = 4.5;

// Angular offsets for derived wave directions (radians)
export const OPP_PERTURB        = 0.21; // ≈12° — not exactly opposite
export const VAR_PERTURB        = 0.35; // ≈20° — not exactly perpendicular