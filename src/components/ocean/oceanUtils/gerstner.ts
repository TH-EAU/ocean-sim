// Mirrors carrier waves from ocean.vert.chunk.glsl — keep in sync with the shader
import type { WaveLayer } from "../../../types/wave";
import { deriveWaves, DEFAULT_WAVE_LAYERS } from "../oceanConsts";
import { sampleTerrainH } from "./terrainSampler";

const TERRAIN_DAMPING = 0.85; // must match uTerrainDamping in OceanChunk.tsx

export function sampleOceanY(
    x: number,
    z: number,
    direction: [number, number],
    disturbtion: number,
    time: number,
    waveLayers: WaveLayer[] = DEFAULT_WAVE_LAYERS,
): number {
    const baseAngle = Math.atan2(direction[1], direction[0]);
    const { dirAmp, params, extra, numCarrier } = deriveWaves(waveLayers, disturbtion, baseAngle);

    const ampScale = 1 - sampleTerrainH(x, z) * TERRAIN_DAMPING;

    let y = 0;
    for (let i = 0; i < numCarrier; i++) {
        const A = dirAmp[i].z * ampScale;
        if (A < 0.001) continue;
        const k        = (2 * Math.PI) / dirAmp[i].w;
        const ws       = params[i].w;    // warpStrength
        const warpFreq = extra[i].x;     // warpSize
        const sx = ws > 0.001 ? x + Math.sin(z * warpFreq        + time * 0.031) * ws : x;
        const sz = ws > 0.001 ? z + Math.sin(x * warpFreq * 1.35 + time * 0.024) * ws : z;
        const phi = k * (dirAmp[i].x * sx + dirAmp[i].y * sz) - params[i].y * time;
        y += A * Math.sin(phi);
    }
    return y;
}
