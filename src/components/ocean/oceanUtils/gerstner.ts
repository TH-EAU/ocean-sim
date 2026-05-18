// Mirrors carrier waves from ocean.vert.chunk.glsl — keep in sync with the shader
import type { WaveLayer } from "@customTypes/wave";
import { DEFAULT_WAVE_LAYERS } from "@ocean/oceanConsts";
import { deriveWaves } from "@ocean/oceanUtils/waveDeriver";
import { sampleTerrainH } from "@terrain/terrainUtils/terrainSampler";

const TERRAIN_DAMPING = 0.85; // must match uTerrainDamping in OceanChunk.tsx

export type DerivedWaves = ReturnType<typeof deriveWaves>;

export function buildDerivedWaves(
    direction: [number, number],
    disturbtion: number,
    waveLayers: WaveLayer[],
): DerivedWaves {
    return deriveWaves(waveLayers, disturbtion, Math.atan2(direction[1], direction[0]));
}

export function sampleOceanYRaw(
    x: number,
    z: number,
    derived: DerivedWaves,
    time: number,
): number {
    const ampScale = 1 - sampleTerrainH(x, z) * TERRAIN_DAMPING;
    let y = 0;
    for (let i = 0; i < derived.numCarrier; i++) {
        const A = derived.dirAmp[i].z * ampScale;
        if (A < 0.001) continue;
        const k = (2 * Math.PI) / derived.dirAmp[i].w;
        const ws = derived.params[i].w;
        const warpFreq = derived.extra[i].x;
        const sx = ws > 0.001 ? x + Math.sin(z * warpFreq + time * 0.031) * ws : x;
        const sz = ws > 0.001 ? z + Math.sin(x * warpFreq * 1.35 + time * 0.024) * ws : z;
        const phi = k * (derived.dirAmp[i].x * sx + derived.dirAmp[i].y * sz) - derived.params[i].y * time;
        y += A * Math.sin(phi);
    }
    return y;
}

export function sampleOceanY(
    x: number,
    z: number,
    direction: [number, number],
    disturbtion: number,
    time: number,
    waveLayers: WaveLayer[] = DEFAULT_WAVE_LAYERS,
): number {
    return sampleOceanYRaw(x, z, buildDerivedWaves(direction, disturbtion, waveLayers), time);
}
