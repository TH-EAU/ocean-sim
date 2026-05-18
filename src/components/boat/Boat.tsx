import { useMemo } from "react";
import { useFBX } from "@react-three/drei";
import * as THREE from "three";

import boatUrl from "@assets/boat/america.fbx?url";

interface BoatProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

export default function Boat({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 0.01,
}: BoatProps) {
  const fbx = useFBX(boatUrl);

  const model = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [fbx]);

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
