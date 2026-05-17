import * as THREE from "three";
import { useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

import heightmapUrl from "../../assets/heightmap.jpg";

import {
  applyFragmentChunk,
  applyVertexChunk,
  handleDepthMaterial,
} from "./oceanUtils/shaders";
import { WAVE_COUNT } from "./OceanGrid";

interface OceanTileProps {
  id: string;
  sharedDepthRT: THREE.WebGLRenderTarget;
  /** Per-wave data computed by OceanGrid: [dir.x, dir.y, amplitude, wavelength] */
  waveDirAmp: THREE.Vector4[];
  /** Per-wave params computed by OceanGrid: [steepness Q, omega, warpStrength, 0] */
  waveParams: THREE.Vector4[];
  tileOffset?: [number, number];
  tileSize?: number;
  resolution?: number;
  renderOrder?: number;
}

const oceanUniformsStore = new Map<string, Record<string, THREE.IUniform>>();

const OceanTile = ({
  id,
  sharedDepthRT,
  waveDirAmp,
  waveParams,
  tileOffset = [0, 0],
  tileSize = 60,
  resolution = 256,
  renderOrder = 0,
}: OceanTileProps) => {
  const { gl } = useThree();
  const heightmap = useTexture(heightmapUrl);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTileOffset: { value: new THREE.Vector2(...tileOffset) },
      uWaveCount: { value: WAVE_COUNT },
      uWaveDirAmp: { value: waveDirAmp },
      uWaveParams: { value: waveParams },
      uResolution: {
        value: new THREE.Vector2(
          gl.getSize(new THREE.Vector2()).x,
          gl.getSize(new THREE.Vector2()).y,
        ),
      },
      uDepthTexture: { value: sharedDepthRT.depthTexture },
      uDepthScale: { value: 21.1 },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 10000 },
      uSunDirection: { value: new THREE.Vector3(0.6, 0.3, 0.7).normalize() },
      uFresnelPower: { value: 0.5 },

    }),
    // waveDirAmp and waveParams are stable arrays mutated in-place by OceanGrid
    // tileOffset is also updated in-place below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gl, heightmap, sharedDepthRT],
  );

  useEffect(() => {
    oceanUniformsStore.set(id, uniforms);
    return () => { oceanUniformsStore.delete(id); };
  }, [id, uniforms]);

  // In-place tileOffset update so shader references stay valid when grid scrolls
  useEffect(() => {
    uniforms.uTileOffset.value.set(tileOffset[0], tileOffset[1]);
  }, [uniforms, tileOffset]);

  const injectShader = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      applyVertexChunk(shader, uniforms);
      applyFragmentChunk(shader);
    },
    [uniforms],
  );

  const depthMaterial = useMemo(
    () => handleDepthMaterial(uniforms, id), // ici voir si avoir séparé l'id de mémoire a une incidence
    [uniforms],
  );

  useFrame((state) => {
    const u = oceanUniformsStore.get(id);
    if (u) {
      u.uTime.value = state.clock.elapsedTime;
      u.uResolution.value.set(state.size.width, state.size.height);
      u.cameraNear.value = state.camera.near;
      u.cameraFar.value = state.camera.far;
    }
  });

  return (
    <mesh
      position={[tileOffset[0], 0, tileOffset[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={renderOrder}
      frustumCulled={false}
      receiveShadow
      // castShadow
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
};

export default OceanTile;
