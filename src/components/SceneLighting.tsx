import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useBoat } from "../contexts/BoatContext";

const SUN_OFFSET = new THREE.Vector3(100, 30, 100);

export default function SceneLighting() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { transformRef } = useBoat();

  useFrame(() => {
    const light = lightRef.current;
    const t     = transformRef.current;
    if (!light || !t) return;
    light.position.set(t.x + SUN_OFFSET.x, SUN_OFFSET.y, t.z + SUN_OFFSET.z);
    light.target.position.set(t.x, t.y, t.z);
    light.target.updateMatrixWorld();
  });

  return (
    <directionalLight
      ref={lightRef}
      intensity={2.0}
      color="#fff5e0"
      castShadow
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-camera-near={1}
      shadow-camera-far={400}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.002}
    />
  );
}
