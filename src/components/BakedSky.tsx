import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

const SUN_POSITION = new THREE.Vector3(100, 10, 100);

export default function BakedSky() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const sky = new Sky();
    sky.scale.setScalar(450000);
    const u = sky.material.uniforms;
    u["turbidity"].value       = 6;
    u["rayleigh"].value        = 1.5;
    u["mieCoefficient"].value  = 0.004;
    u["mieDirectionalG"].value = 0.85;
    u["sunPosition"].value.copy(SUN_POSITION);

    const cubeRT = new THREE.WebGLCubeRenderTarget(512, {
      type: THREE.HalfFloatType,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 1e6, cubeRT);
    const tmpScene = new THREE.Scene();
    tmpScene.add(sky, cubeCamera);
    cubeCamera.update(gl, tmpScene);

    scene.background = cubeRT.texture;

    return () => cubeRT.dispose();
  }, [gl, scene]);

  return null;
}
