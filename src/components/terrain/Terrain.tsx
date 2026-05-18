import { useMemo } from "react";
import { useFBX } from "@react-three/drei";
import * as THREE from "three";

import peleUrl from "@assets/pele.fbx?url";

const ROCK_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0.35, 0.30, 0.25),
  roughness: 0.92,
  metalness: 0.0,
});

export default function Terrain() {
  const fbx = useFBX(peleUrl);

  const model = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = ROCK_MATERIAL;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [fbx]);

  return <primitive object={model} />;
}
