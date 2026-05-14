import * as THREE from "three";
import { useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

import heightmapUrl from "../../assets/heightmap.jpg";

import { applyFragmentChunk, applyVertexChunk, handleDepthMaterial } from "./oceanUtils/shaders";

interface OceanTileProps {
  sharedDepthRT: THREE.WebGLRenderTarget;
  disturbtion?: number;
  windDirection?: [number, number];
  windSpeed?: number;
  currentDirection?: [number, number];
  currentSpeed?: number;
  tileOffset?: [number, number];
  tileSize?: number;
  resolution?: number;
  lodLevel?: number;
  innerHalfSize?: number;
  renderOrder?: number;
}

const oceanUniformsStore = new Map<string, Record<string, THREE.IUniform>>();

const OceanTile = ({
  id,
  sharedDepthRT,
  disturbtion = 0.3,
  windDirection = [0, 1],
  windSpeed = 1.0,
  currentDirection = [0, 1],
  currentSpeed = 0.5,
  tileOffset = [0, 0],
  tileSize = 60,
  resolution = 256,
  lodLevel = 0,
  innerHalfSize = 0,
  renderOrder = 0,
}: OceanTileProps & { id: string }) => {
  const { gl } = useThree();

  const heightmap = useTexture(heightmapUrl);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(...windDirection) },
    uWindSpeed: { value: windSpeed },
    uCurrentDir: { value: new THREE.Vector2(...currentDirection) },
    uCurrentSpeed: { value: currentSpeed },
    uWaveAmplitude: { value: disturbtion },
    uInnerHalfSize: { value: innerHalfSize },
    uTileOffset: { value: new THREE.Vector2(...tileOffset) },
    uLodLevel: { value: lodLevel },
    uResolution: { value: new THREE.Vector2(gl.getSize(new THREE.Vector2()).x, gl.getSize(new THREE.Vector2()).y) },
    uHeightmap: { value: heightmap },
    uTerrainBounds: { value: new THREE.Vector4(-30, -30, 30, 30) },
    uHeightScale: { value: 10 },
    uTerrainDepth: { value: -4 },
    uMaxDepth: { value: 5.0 },
    uDepthTexture: { value: sharedDepthRT.depthTexture },
    uDepthScale: { value: 5.1 },
    uDepthFade: { value: 0.1 },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 10000 },
    uSceneColor: { value: sharedDepthRT.texture },
    uReflectionStrength: { value: 0.05 },
    uReflectionBlend: { value: 0.4 },
    uSunDirection: { value: new THREE.Vector3(0.6, 0.3, 0.7).normalize() },
    uFresnelPower: { value: 5.0 },
    uSpecularPower: { value: 512.0 },
    uSpecularIntensity: { value: 2.0 },
  }), [
    windDirection, windSpeed, currentDirection, currentSpeed, disturbtion, innerHalfSize, lodLevel,
    gl, heightmap, sharedDepthRT
    // tileOffset intentionally excluded — updated in-place below
  ]);

  useEffect((): any => {
    oceanUniformsStore.set(id, uniforms);
    return () => oceanUniformsStore.delete(id);
  }, [id, uniforms]);

  // In-place tileOffset update so shader references stay valid when grid scrolls
  useEffect(() => {
    uniforms.uTileOffset.value.set(tileOffset[0], tileOffset[1]);
  }, [uniforms, tileOffset]);

  const injectShader = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      applyVertexChunk(shader, uniforms)
      applyFragmentChunk(shader)
    },
    [uniforms],
  );

  const depthMaterial = useMemo(
    () => handleDepthMaterial(uniforms),
    [uniforms]
  );

  useFrame((state) => {
    const storedUniforms = oceanUniformsStore.get(id);
    if (storedUniforms) {
      storedUniforms.uTime.value = state.clock.elapsedTime;
      const size = state.size;
      storedUniforms.uResolution.value.set(size.width, size.height);
      storedUniforms.cameraNear.value = state.camera.near;
      storedUniforms.cameraFar.value = state.camera.far;
    };
  })

  return (
    <mesh
      position={[tileOffset[0], 0, tileOffset[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={renderOrder}
      frustumCulled={false}
      receiveShadow
      castShadow
      customDepthMaterial={depthMaterial}
    >
      <planeGeometry args={[tileSize, tileSize, resolution, resolution]} />
      <meshStandardMaterial
        onBeforeCompile={injectShader}
        customProgramCacheKey={() => `ocean`}
        transparent
        roughness={0}
        depthWrite={true}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

export default OceanTile;
