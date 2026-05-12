import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import gerstnerChunk from "./shaders/chunks/wave.vert.chunk.glsl";
import waterUniformsChunk from "./shaders/chunks/waterUniforms.vert.chunk.glsl";
import type { WaveLayer } from "../types/wave";

const injectShader = (
  shader: THREE.WebGLProgramParametersWithUniforms,
  uTime: { value: number },
) => {
  shader.uniforms.uTime = uTime;
  shader.vertexShader = shader.vertexShader
    .replace(`#include <common>`, `#include <common>\n${waterUniformsChunk}`)
    .replace(`#include <begin_vertex>`, gerstnerChunk);

  console.log(
    shader.vertexShader
      .split("\n")
      .map((line, i) => `${String(i + 1).padStart(3, " ")} | ${line}`)
      .join("\n"),
  );
};

interface OceanTileProps {
  carrierWaves?: WaveLayer[];
  secondaryWaves?: WaveLayer[];
  modulationStrength?: number; // [0..1] — carrier height → secondary amplitude
  secondaryNoiseScale?: number; // noise frequency in world-space (~0.06 → patches of ~17m)
  secondaryNoiseStrength?: number; // amplitude variation depth [0..1]
  detailFBmScale?: number; // world-space frequency (~0.5 → features at ~2m)
  detailFBmStrength?: number; // max Y displacement in world units
  detailFBmSpeed?: number; // scroll speed
  detailWindDir?: [number, number]; // scroll direction (world XZ)
  terrainDamping?: number;
}

const OceanTile = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const uTime = useRef({ value: 0 });

  useFrame(({ clock }) => {
    uTime.current.value = clock.getElapsedTime();
  });

  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
  });
  depthMaterial.onBeforeCompile = (shader) => {
    injectShader(shader, uTime.current);
  };
  depthMaterial.customProgramCacheKey = () => "ocean-depth";

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      castShadow
      customDepthMaterial={depthMaterial}
    >
      <planeGeometry args={[60, 60, 512, 512]} />
      <meshStandardMaterial
        color={new THREE.Color(0xffffff)}
        onBeforeCompile={(s) => injectShader(s, uTime.current)}
        customProgramCacheKey={() => "ocean"}
      />
    </mesh>
  );
};

export default OceanTile;
