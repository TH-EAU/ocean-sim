import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import testUniformVert from "./shaders/testUniform.vert.glsl?raw";
import testVertChunk from "./shaders/test.vert.glsl?raw";
import testUniformFrag from "./shaders/testUniform.frag.glsl?raw";
import testFragChunk from "./shaders/test.frag.glsl?raw";
import testHelperFragChunk from "./shaders/testHelper.frag.glsl?raw";

const FogPlane = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl, scene, camera, size } = useThree();

  // 1. Création du Render Target pour la depth
  const depthRT = useMemo(() => {
    const dt = new THREE.DepthTexture(0, 0);
    dt.type = THREE.UnsignedShortType;
    return new THREE.WebGLRenderTarget(0, 0, {
      depthTexture: dt,
      depthBuffer: true,
    });
  }, []);

  // 2. Gestion de la taille (Optimisation : 50% de la résolution pour la perf)
  useEffect(() => {
    const pixelRatio = gl.getPixelRatio();
    const w = Math.floor(size.width * pixelRatio * 0.5);
    const h = Math.floor(size.height * pixelRatio * 0.5);
    depthRT.setSize(w, h);
  }, [size.width, size.height, gl, depthRT]);

  // 3. Rendu de la scène dans le RT (Priority -1 pour être avant le rendu principal)
  useFrame(() => {
    if (!meshRef.current) return;

    // Cacher la plane pendant le rendu de la depth pour éviter qu'elle n'écrase sa propre profondeur
    meshRef.current.visible = false;

    gl.setRenderTarget(depthRT);
    gl.clear();
    gl.render(scene, camera);

    gl.setRenderTarget(null);
    meshRef.current.visible = true;
  }, -1);

  const injectShader = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    // Injection des chunks
    shader.vertexShader = shader.vertexShader
      .replace(`#include <common>`, `#include <common>\n${testUniformVert}`)
      .replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>\n${testVertChunk}`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        `#include <common>`,
        `#include <common>\n${testUniformFrag}\n${testHelperFragChunk}`,
      )
      .replace(
        `#include <map_fragment>`,
        `#include <map_fragment>\n${testFragChunk}`,
      );

    // Injection des Uniforms
    shader.uniforms.uDepthTexture = { value: depthRT.depthTexture };
    shader.uniforms.cameraNear = { value: camera.near };
    shader.uniforms.cameraFar = { value: camera.far };
    shader.uniforms.uMaxDistance = { value: 50.0 }; // Ajuste cette valeur
  };

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 256, 256]} />
      <meshStandardMaterial
        color="red"
        transparent={true}
        onBeforeCompile={injectShader}
      />
    </mesh>
  );
};

export default FogPlane;
