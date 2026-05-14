import * as THREE from "three";
import { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import OceanTile from "./OceanTile";

const CHUNK_SIZE = 200;
const GRID_RADIUS = 2;   // 5×5 = 25 chunks
const SNAP_SIZE = 10;    // fine tracking — camera within ±5 units of grid center

const LOD_LEVELS = [
  { resolution: 128 }, // ring 0 — centre
  { resolution: 64 }, // ring 1
  { resolution: 32 }, // ring 2
];

interface OceanGridProps {
  disturbtion?: number;
  currentDirection?: [number, number];
  currentSpeed?: number;
}

const OceanGrid = ({
  disturbtion = 0.3,
  currentDirection = [0, 1],
  currentSpeed = 0.5,
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

  const snapRef = useRef({ x: 0, z: 0 });
  const [snap, setSnap] = useState<[number, number]>([0, 0]);

  // Depth pre-pass: hide all ocean planes, render scene, show them back
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

  // Update snap position when camera crosses chunk boundary
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
    <group ref={groupRef}>
      {chunks.map(({ row, col, resolution }) => {
        const cx = snap[0] + col * CHUNK_SIZE;
        const cz = snap[1] + row * CHUNK_SIZE;
        return (
          <OceanTile
            key={`chunk_${row}_${col}`}
            id={`chunk_${row}_${col}`}
            sharedDepthRT={sharedDepthRT}
            tileOffset={[cx, cz]}
            tileSize={CHUNK_SIZE}
            resolution={resolution}
            innerHalfSize={0}
            disturbtion={disturbtion}
            currentDirection={currentDirection}
            currentSpeed={currentSpeed}
          />
        );
      })}
    </group>
  );
};

export default OceanGrid;
