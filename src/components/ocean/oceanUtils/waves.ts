import type { WaveLayer } from "../../../types/wave";
import { MAX_WAVES } from "../oceanConsts";



export function fillWaveBuffers(
    waves: WaveLayer[],
    dirs: Float32Array,
    amps: Float32Array,
    steeps: Float32Array,
    lens: Float32Array,
    speeds: Float32Array,
    warps: Float32Array,
) {
    dirs.fill(0);
    amps.fill(0);
    steeps.fill(0);
    lens.fill(1);
    speeds.fill(0);
    warps.fill(0);
    waves.forEach((w, i) => {
        if (i >= MAX_WAVES) return;
        dirs[i * 2] = w.direction[0];
        dirs[i * 2 + 1] = w.direction[1];
        amps[i] = w.amplitude;
        steeps[i] = w.steepness;
        lens[i] = w.wavelength;
        speeds[i] = w.speed;
        warps[i] = w.warpStrength ?? 0;
    });
}