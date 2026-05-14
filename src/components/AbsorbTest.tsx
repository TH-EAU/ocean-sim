import * as THREE from "three";

import vertexShader from "./shaders/absorb.vert.glsl?raw";
import fragmentShader from "./shaders/absorb.frag.glsl?raw";
import heightmapUrl from "../assets/heightmap.jpg?url";
import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import { TERRAIN_BOUNDS } from "./ocean/oceanConsts";

const AbsorbTest = () => {
  const heightmap = useTexture(heightmapUrl, (tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  });

  const uniforms = useMemo<Record<string, THREE.IUniform>>(
    () => ({
      uHeightmap: { value: heightmap },
      uTerrainBounds: { value: TERRAIN_BOUNDS },
      uHeightScale: { value: 4 },
      uTerrainDepth: { value: -2 },
      uTerrainHeight: { value: 3 },
    }),
    [heightmap],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[160, 160, 256, 256]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        polygonOffset
        polygonOffsetFactor={2}
        polygonOffsetUnits={2}
      />
    </mesh>
  );
};

export default AbsorbTest;
