import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useOcean } from "@ocean/OceanContext";
import { useBoat } from "@contexts/BoatContext";
import { buildDerivedWaves, sampleOceanYRaw } from "@ocean/oceanUtils/gerstner";

const GRID = 20;
const SIZE = 40;

export default function OceanWaveDebug() {
  const { disturbtion, currentDirection, waveLayers } = useOcean();
  const { transformRef } = useBoat();

  const { positions, geometry } = useMemo(() => {
    const segH = GRID * (GRID + 1);
    const segV = GRID * (GRID + 1);
    const positions = new Float32Array((segH + segV) * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { positions, geometry };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const bx = transformRef?.current?.x ?? 0;
    const bz = transformRef?.current?.z ?? 0;
    const step = SIZE / GRID;
    let idx = 0;

    const derived = buildDerivedWaves(currentDirection, disturbtion, waveLayers);
    const y = (xi: number, zi: number) =>
      sampleOceanYRaw(bx - SIZE / 2 + xi * step, bz - SIZE / 2 + zi * step, derived, t);

    for (let zi = 0; zi <= GRID; zi++) {
      for (let xi = 0; xi < GRID; xi++) {
        positions[idx++] = bx - SIZE / 2 + xi * step;
        positions[idx++] = y(xi, zi);
        positions[idx++] = bz - SIZE / 2 + zi * step;
        positions[idx++] = bx - SIZE / 2 + (xi + 1) * step;
        positions[idx++] = y(xi + 1, zi);
        positions[idx++] = bz - SIZE / 2 + zi * step;
      }
    }

    for (let xi = 0; xi <= GRID; xi++) {
      for (let zi = 0; zi < GRID; zi++) {
        positions[idx++] = bx - SIZE / 2 + xi * step;
        positions[idx++] = y(xi, zi);
        positions[idx++] = bz - SIZE / 2 + zi * step;
        positions[idx++] = bx - SIZE / 2 + xi * step;
        positions[idx++] = y(xi, zi + 1);
        positions[idx++] = bz - SIZE / 2 + (zi + 1) * step;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={0xffff00} />
    </lineSegments>
  );
}
