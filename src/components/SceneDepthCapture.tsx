import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface SceneDepthCaptureProps {
  depthTexRef: React.MutableRefObject<THREE.DepthTexture | null>;
}

export default function SceneDepthCapture({ depthTexRef }: SceneDepthCaptureProps) {
  const { gl, scene, camera, size } = useThree();
  const rtRef = useRef<THREE.WebGLRenderTarget | null>(null);

  useEffect(() => {
    const w = Math.floor(size.width * gl.getPixelRatio());
    const h = Math.floor(size.height * gl.getPixelRatio());

    rtRef.current?.dispose();

    const dt = new THREE.DepthTexture(w, h);
    dt.type = THREE.UnsignedShortType;
    dt.format = THREE.DepthFormat;

    const rt = new THREE.WebGLRenderTarget(w, h, {
      depthTexture: dt,
      depthBuffer: true,
    });

    rtRef.current = rt;
    depthTexRef.current = dt;

    return () => {
      rt.dispose();
      depthTexRef.current = null;
    };
  }, [size.width, size.height, gl, depthTexRef]);

  useEffect(() => {
    camera.layers.enable(1);
  }, [camera]);

  useFrame(() => {
    const rt = rtRef.current;
    if (!rt) return;

    camera.layers.disable(1);
    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    camera.layers.enable(1);
  }, -1);

  return null;
}
