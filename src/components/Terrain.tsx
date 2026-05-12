import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import vertexShader   from "./shaders/terrain.vert.glsl?raw";
import fragmentShader from "./shaders/terrain.frag.glsl?raw";
import heightmapUrl   from "../assets/heightmap.png?url";

const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
const LIGHT_DIR      = new THREE.Vector3(1.0, 2.0, 1.0).normalize();
const LIGHT_COLOR    = new THREE.Color(1.0, 0.95, 0.88);
const AMBIENT        = new THREE.Color(0.08, 0.12, 0.18);

interface TerrainProps {
  heightScale?:  number;
  terrainDepth?: number;
  waterLine?:    number;
  fogColor?:     string;
  fogDensity?:   number;
}

export default function Terrain({
  heightScale  = 10,
  terrainDepth = -4,
  waterLine    = 0,
  fogColor     = "#94bfe9",
  fogDensity   = 0.018,
}: TerrainProps) {
  const heightmap = useTexture(heightmapUrl, (tex) => {
    tex.minFilter       = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate     = true;
  });

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
    uHeightmap:     { value: heightmap },
    uTerrainBounds: { value: TERRAIN_BOUNDS },
    uHeightScale:   { value: heightScale },
    uTerrainDepth:  { value: terrainDepth },
    uWaterLine:     { value: waterLine },
    uLightDir:      { value: LIGHT_DIR },
    uLightColor:    { value: LIGHT_COLOR },
    uAmbientColor:  { value: AMBIENT },
    uFogColor:      { value: new THREE.Color(fogColor) },
    uFogDensity:    { value: fogDensity },
  }), [heightmap, heightScale, terrainDepth, waterLine, fogColor, fogDensity]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60, 256, 256]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        polygonOffset
        polygonOffsetFactor={2}
        polygonOffsetUnits={2}
      />
    </mesh>
  );
}
