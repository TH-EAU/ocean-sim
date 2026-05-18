
import type { GerstnerWave } from '@/src/types/waveConfig';
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

// Déplacement d'un vertex par une vague — retourne vec3
function gerstnerDisplace(wave: GerstnerWave, x: number, z: number, time: number, waveCount: number): THREE.Vector3 {
    const k = TWO_PI / wave.wavelength;
    const c = Math.sqrt(9.81 / k);
    const f = k * (wave.direction[0] * x + wave.direction[1] * z) - wave.speed * c * time;
    const Qi = wave.steepness / (wave.amplitude * k * waveCount);

    return new THREE.Vector3(
        Qi * wave.amplitude * wave.direction[0] * Math.cos(f),
        wave.amplitude * Math.sin(f),
        Qi * wave.amplitude * wave.direction[1] * Math.cos(f),
    );
}

// Déplacement complet (utile pour normales, foam, etc.)
export function getWaveDisplacement(
    waves: GerstnerWave[],
    x: number,
    z: number,
    time: number,
): THREE.Vector3 {
    const result = new THREE.Vector3();
    for (const wave of waves) {
        result.add(gerstnerDisplace(wave, x, z, time, waves.length));
    }
    return result;
}
