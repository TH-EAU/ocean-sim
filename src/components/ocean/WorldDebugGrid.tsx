import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useOcean } from "@/src/contexts/OceanContext";
import { useBoat } from "@contexts/BoatContext";
import { buildDerivedWaves, sampleOceanPosition } from "@ocean/oceanUtils/gerstner";

const N = 60; // cells (1 m each → 60 m wide grid)

export default function WorldDebugGrid() {
  const { disturbtion, currentDirection, waveLayers } = useOcean();
  const { transformRef } = useBoat();

  const { positions, geometry } = useMemo(() => {
    const segX = N * (N + 1);
    const segZ = N * (N + 1);
    const positions = new Float32Array((segX + segZ) * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { positions, geometry };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const bx = transformRef?.current?.x ?? 0;
    const bz = transformRef?.current?.z ?? 0;

    // Grid origin snapped to world integers so lines stay on integer undisplaced coordinates
    const ox = Math.floor(bx) - N / 2;
    const oz = Math.floor(bz) - N / 2;

    const derived = buildDerivedWaves(currentDirection, disturbtion, waveLayers);
    let idx = 0;

    // Segments along X (zi fixed, xi varies)
    for (let zi = 0; zi <= N; zi++) {
      const wz = oz + zi;
      for (let xi = 0; xi < N; xi++) {
        const p0 = sampleOceanPosition(ox + xi, wz, derived, t);
        const p1 = sampleOceanPosition(ox + xi + 1, wz, derived, t);
        positions[idx++] = p0.x; positions[idx++] = p0.y; positions[idx++] = p0.z;
        positions[idx++] = p1.x; positions[idx++] = p1.y; positions[idx++] = p1.z;
      }
    }

    // Segments along Z (xi fixed, zi varies)
    for (let xi = 0; xi <= N; xi++) {
      const wx = ox + xi;
      for (let zi = 0; zi < N; zi++) {
        const p0 = sampleOceanPosition(wx, oz + zi, derived, t);
        const p1 = sampleOceanPosition(wx, oz + zi + 1, derived, t);
        positions[idx++] = p0.x; positions[idx++] = p0.y; positions[idx++] = p0.z;
        positions[idx++] = p1.x; positions[idx++] = p1.y; positions[idx++] = p1.z;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={0x00ffff} />
    </lineSegments>
  );
}
