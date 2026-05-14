import * as THREE from "three"
import type { WaveLayer } from "../../types/wave";

export const MAX_WAVES = 8;
export const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
export const DEFAULT_WIND_DIR: [number, number] = [-0.8, -0.8];
export const DEFAULT_SUN_DIR: [number, number, number] = [100, 10, 100];
export const EMPTY_WAVES: WaveLayer[] = [];