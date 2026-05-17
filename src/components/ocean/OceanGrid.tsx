import * as THREE from "three";
import { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import OceanTile from "./OceanTile";
import { OceanContext } from "./OceanContext";
import {
  MAX_WAVES,
  BASE_AMP_CARRIER,
  BASE_AMP_OPP,
  BASE_AMP_VAR,
  BASE_WL_CARRIER,
  BASE_STEEPNESS,
  BASE_WARP_CARRIER,
  BASE_WARP_OPP,
  BASE_WARP_VAR,
  SPEED_SCALE,
  OPP_PERTURB,
  VAR_PERTURB,
} from "./oceanConsts";

const CHUNK_SIZE = 100;
const GRID_RADIUS = 10; // 5×5 = 25 chunks

const LOD_LEVELS = [
  { resolution: 128 }, // ring 0 — centre
  { resolution: 64 },  // ring 1
  { resolution: 32 },  // ring 2
];

interface OceanGridProps {
  disturbtion?: number;
  currentDirection?: [number, number];
}

export const WAVE_COUNT = 3;

// Build a safe-default Vector4 array of size MAX_WAVES
// Unused entries get wavelength=1 to avoid k=2π/0=Infinity in the shader
const makeSafeV4Array = () =>
  Array.from({ length: MAX_WAVES }, () => new THREE.Vector4(0, 0, 0, 1));

/** Derive per-wave parameters from disturbtion and a base angle (radians). */
function deriveWaves(
  disturbtion: number,
  baseAngle: number,
): { dirAmp: THREE.Vector4[]; params: THREE.Vector4[] } {
  const d = Math.max(disturbtion, 0.001);

  // Directions
  const angles = [
    baseAngle,                                  // carrier
    baseAngle + Math.PI + OPP_PERTURB,          // opposition
    baseAngle + Math.PI / 2 + VAR_PERTURB,      // variation
  ];

  const amps = [
    BASE_AMP_CARRIER * d,
    BASE_AMP_OPP * d,
    BASE_AMP_VAR * d,
  ];

  const wavelengths = [
    BASE_WL_CARRIER * d,
    BASE_WL_CARRIER * 0.75 * d,
    BASE_WL_CARRIER * 0.75 * d,
  ];

  const warps = [BASE_WARP_CARRIER, BASE_WARP_OPP, BASE_WARP_VAR];

  const dirAmp = makeSafeV4Array();
  const params = makeSafeV4Array();

  for (let i = 0; i < 3; i++) {
    const A = amps[i];
    const wl = Math.max(wavelengths[i], 0.1);
    const k = (2 * Math.PI) / wl;
    const qSafe = 0.8 / (k * A);
    const Q = Math.min(BASE_STEEPNESS, qSafe);
    const omega = SPEED_SCALE * A * k;

    dirAmp[i].set(Math.cos(angles[i]), Math.sin(angles[i]), A, wl);
    params[i].set(Q, omega, warps[i], 0);
  }

  return { dirAmp, params };
}

const OceanGrid = ({
  disturbtion = 0.3,
  currentDirection = [0, 1],
}: OceanGridProps) => {
  const { gl, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const sharedDepthRT = useMemo(() => {
    const dt = new THREE.DepthTexture(0, 0);
    dt.type = THREE.UnsignedShortType;
    return new THREE.WebGLRenderTarget(0, 0, {
      depthTexture: dt,
      depthBuffer: true,
    });
  }, []);

  // Derive wave arrays — stable objects mutated in-place when disturbtion changes
  const { waveDirAmp, waveParams } = useMemo(() => {
    const angle = Math.atan2(currentDirection[1], currentDirection[0]);
    const { dirAmp, params } = deriveWaves(disturbtion, angle);
    return { waveDirAmp: dirAmp, waveParams: params };
  }, [disturbtion, currentDirection]);

  // currentSpeed exposed via context = carrier angular velocity / carrier k
  const currentSpeed = useMemo(() => {
    return SPEED_SCALE * BASE_AMP_CARRIER * Math.max(disturbtion, 0.001);
  }, [disturbtion]);

  const snapRef = useRef({ x: 0, z: 0 });
  const [snap, setSnap] = useState<[number, number]>([0, 0]);

  // Depth pre-pass: hide ocean, render scene to depth RT, restore
  useFrame(({ camera, size }) => {
    if (!groupRef.current) return;
    if (sharedDepthRT.width !== size.width || sharedDepthRT.height !== size.height) {
      sharedDepthRT.setSize(size.width, size.height);
    }
    groupRef.current.visible = false;
    gl.setRenderTarget(sharedDepthRT);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    groupRef.current.visible = true;
  }, -1);

  useFrame(({ camera }) => {
    const sx = camera.position.x;
    const sz = camera.position.z;
    if (sx !== snapRef.current.x || sz !== snapRef.current.z) {
      snapRef.current = { x: sx, z: sz };
      setSnap([sx, sz]);
    }
  });

  const chunks = useMemo(() => {
    const list: { row: number; col: number; resolution: number }[] = [];
    for (let row = -GRID_RADIUS; row <= GRID_RADIUS; row++) {
      for (let col = -GRID_RADIUS; col <= GRID_RADIUS; col++) {
        const ring = Math.max(Math.abs(row), Math.abs(col));
        const resolution = LOD_LEVELS[Math.min(ring, LOD_LEVELS.length - 1)].resolution;
        list.push({ row, col, resolution });
      }
    }
    return list;
  }, []);

  return (
    <OceanContext.Provider
      value={{ currentSpeed, currentDirection }}
    >
      <group ref={groupRef}>
        {chunks.map(({ row, col, resolution }) => {
          const cx = snap[0] + col * CHUNK_SIZE;
          const cz = snap[1] + row * CHUNK_SIZE;
          return (
            <OceanTile
              key={`chunk_${row}_${col}`}
              id={`chunk_${row}_${col}`}
              sharedDepthRT={sharedDepthRT}
              waveDirAmp={waveDirAmp}
              waveParams={waveParams}
              tileOffset={[cx, cz]}
              tileSize={CHUNK_SIZE}
              resolution={resolution}
              disturbtion={disturbtion}
              currentDirection={currentDirection}
            />
          );
        })}
      </group>
    </OceanContext.Provider>
  );
};

export default OceanGrid;
