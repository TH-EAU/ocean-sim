import * as THREE from "three";
import type { WaveLayer } from "@customTypes/wave";
import { MAX_WAVES, BASE_STEEPNESS, SPEED_SCALE } from "@ocean/oceanConsts";

function makeSafeV4Array() {
    return Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 0, 0, 1));
}

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
