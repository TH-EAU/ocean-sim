import type { GerstnerWave, WaveGenConfig } from "@/src/types/waveConfig";
import * as THREE from "three"

// Mulberry32 — déterministe, même résultat côté CPU et si besoin GLSL
export function seededRng(seed: number): () => number {
    let s = seed;
    return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}


// ici la fonction génère des waves un peu au hasard, c'est intéressant mais à voir si c'est ce que je veux
// Todo c'est de la demer 
export function generateWaves(config: WaveGenConfig): GerstnerWave[] {
    const rng = seededRng(config.seed ?? 1337);

    return Array.from({ length: config.count }, () => {
        const angleOffset = (rng() - 0.5) * 2 * config.spread;
        const angle = config.baseDirection + angleOffset;

        // Log-normale → beaucoup de petites vagues, quelques grandes
        const amplitude = config.baseAmplitude * Math.exp((rng() - 0.5) * 2 * config.chaos);
        const wavelength = config.baseWavelength * Math.exp((rng() - 0.5) * 2 * config.chaos);
        const steepness = THREE.MathUtils.clamp(0.3 + (rng() - 0.5) * config.chaos, 0.0, 0.9);
        const speed = config.baseSpeed * (1 + (rng() - 0.5) * config.chaos);

        return {
            direction: [Math.cos(angle), Math.sin(angle)],
            amplitude,
            wavelength,
            steepness,
            speed,
        };
    });
}