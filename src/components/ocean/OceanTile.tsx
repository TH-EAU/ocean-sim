import * as THREE from "three";
import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

import type { WaveLayer } from "../../types/wave";

import heightmapUrl from "../../assets/heightmap.jpg";
import normalMapUrl from "../../assets/waterNormal.jpg?url";

import { MAX_WAVES, TERRAIN_BOUNDS, DEFAULT_WIND_DIR, DEFAULT_SUN_DIR, EMPTY_WAVES } from "./oceanConsts"

import { applyFragmentChunk, applyVertexChunk, handleDepthMaterial } from "./oceanUtils/shaders";
import { fillWaveBuffers } from "./oceanUtils/waves";
import { repeatTexture, singleTexture } from "./oceanUtils/textures";

interface OceanTileProps {
  carrierWaves?: WaveLayer[];
  secondaryWaves?: WaveLayer[];
  modulationStrength?: number;
  secondaryNoiseScale?: number;
  secondaryNoiseStrength?: number;
  detailFBmScale?: number;
  detailFBmStrength?: number;
  detailFBmSpeed?: number;
  detailWindDir?: [number, number];
  terrainDamping?: number;
  depthFade?: number;
  depthScale?: number;
  sunDirection?: [number, number, number];
  normalStrength?: number;
  normalScale?: number;
  normalWarp?: number;
}

const OceanTile = ({
  carrierWaves = EMPTY_WAVES,
  secondaryWaves = EMPTY_WAVES,
  modulationStrength = 0.7,
  secondaryNoiseScale = 0.06,
  secondaryNoiseStrength = 0.7,
  detailFBmScale = 0.5,
  detailFBmStrength = 0.015,
  detailFBmSpeed = 0.04,
  detailWindDir = DEFAULT_WIND_DIR,
  terrainDamping = 0.9,
  depthFade = 0.5,
  depthScale = 5.0,
  sunDirection = DEFAULT_SUN_DIR,
  normalStrength = 0.4,
  normalScale = 0.5,
  normalWarp = 0.25,
}: OceanTileProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl, scene, size } = useThree();

  const depthRT = useMemo(() => {
    const dt = new THREE.DepthTexture(0, 0);
    dt.type = THREE.UnsignedShortType;
    return new THREE.WebGLRenderTarget(0, 0, {
      depthTexture: dt,
      depthBuffer: true,
    });
  }, []);

  const normalMap = useTexture(normalMapUrl, repeatTexture);
  const heightmap = useTexture(heightmapUrl, singleTexture);



  const dirs = useMemo(() => new Float32Array(MAX_WAVES * 2), []);
  const amps = useMemo(() => new Float32Array(MAX_WAVES), []);
  const steeps = useMemo(() => new Float32Array(MAX_WAVES), []);
  const lens = useMemo(() => {
    const a = new Float32Array(MAX_WAVES);
    a.fill(1);
    return a;
  }, []);
  const speeds = useMemo(() => new Float32Array(MAX_WAVES), []);
  const warps = useMemo(() => new Float32Array(MAX_WAVES), []);

  // Uniforms stables partagés entre meshStandardMaterial et depthMaterial
  const customUniforms = useMemo(() => {
    const allWaves = [...carrierWaves, ...secondaryWaves];
    fillWaveBuffers(allWaves, dirs, amps, steeps, lens, speeds, warps);
    return {
      uTime: { value: 0 },
      uWaveDirections: { value: dirs },
      uWaveAmplitudes: { value: amps },
      uWaveSteepnesses: { value: steeps },
      uWaveWavelengths: { value: lens },
      uWaveSpeeds: { value: speeds },
      uWaveWarpStrengths: { value: warps },
      uNumCarrierWaves: { value: carrierWaves.length },
      uNumSecondaryWaves: { value: secondaryWaves.length },
      uModulationStrength: { value: modulationStrength },
      uSecondaryNoiseScale: { value: secondaryNoiseScale },
      uSecondaryNoiseStrength: { value: secondaryNoiseStrength },
      uDetailFBmScale: { value: detailFBmScale },
      uDetailFBmStrength: { value: detailFBmStrength },
      uDetailFBmSpeed: { value: detailFBmSpeed },
      uDetailWindDir: {
        value: new THREE.Vector2(detailWindDir[0], detailWindDir[1]),
      },
      uHeightmap: { value: heightmap },
      uTerrainBounds: { value: TERRAIN_BOUNDS },
      uTerrainDamping: { value: terrainDamping },
      uSunDirection: {
        value: new THREE.Vector3(
          sunDirection[0],
          sunDirection[1],
          sunDirection[2],
        ).normalize(),
      },
      uNormalMap: { value: normalMap },
      uNormalStrength: { value: normalStrength },
      uNormalScale: { value: normalScale },
      uNormalWarp: { value: normalWarp },
      uDepthTexture: { value: null as THREE.Texture | null },
      uDepthFade: { value: 5.5 },
      uDepthScale: { value: 0.1 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000 },
    };
  }, []);


  const injectShader = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      // Object.assign(shader.uniforms, customUniforms);
      applyVertexChunk(shader, customUniforms)
      applyFragmentChunk(shader)
    },
    [customUniforms, applyVertexChunk],
  );

  const depthMaterial = useMemo(handleDepthMaterial, [applyVertexChunk]);

  // Sync waves
  useEffect(() => {
    const allWaves = [...carrierWaves, ...secondaryWaves];
    fillWaveBuffers(allWaves, dirs, amps, steeps, lens, speeds, warps);
    customUniforms.uNumCarrierWaves.value = carrierWaves.length;
    customUniforms.uNumSecondaryWaves.value = secondaryWaves.length;
  }, [
    carrierWaves,
    secondaryWaves,
    dirs,
    amps,
    steeps,
    lens,
    speeds,
    warps,
    customUniforms,
  ]);

  useEffect(() => {
    customUniforms.uModulationStrength.value = modulationStrength;
    customUniforms.uSecondaryNoiseScale.value = secondaryNoiseScale;
    customUniforms.uSecondaryNoiseStrength.value = secondaryNoiseStrength;
  }, [
    modulationStrength,
    secondaryNoiseScale,
    secondaryNoiseStrength,
    customUniforms,
  ]);

  useEffect(() => {
    customUniforms.uDetailFBmScale.value = detailFBmScale;
    customUniforms.uDetailFBmStrength.value = detailFBmStrength;
    customUniforms.uDetailFBmSpeed.value = detailFBmSpeed;
    customUniforms.uDetailWindDir.value.set(detailWindDir[0], detailWindDir[1]);
  }, [
    detailFBmScale,
    detailFBmStrength,
    detailFBmSpeed,
    detailWindDir,
    customUniforms,
  ]);

  useEffect(() => {
    customUniforms.uTerrainDamping.value = terrainDamping;
  }, [terrainDamping, customUniforms]);

  useEffect(() => {
    customUniforms.uDepthFade.value = depthFade;
    customUniforms.uDepthScale.value = depthScale;
  }, [depthFade, depthScale, customUniforms]);

  useEffect(() => {
    customUniforms.uSunDirection.value
      .set(sunDirection[0], sunDirection[1], sunDirection[2])
      .normalize();
  }, [sunDirection, customUniforms]);

  useEffect(() => {
    customUniforms.uNormalStrength.value = normalStrength;
    customUniforms.uNormalScale.value = normalScale;
    customUniforms.uNormalWarp.value = normalWarp;
  }, [normalStrength, normalScale, normalWarp, customUniforms]);

  useEffect(() => {
    customUniforms.uDepthTexture.value = depthRT.depthTexture;
    return () => depthRT.dispose();
  }, [depthRT, customUniforms]);

  useEffect(() => {
    const w = Math.floor(size.width * gl.getPixelRatio());
    const h = Math.floor(size.height * gl.getPixelRatio());
    depthRT.setSize(w, h);
    customUniforms.uResolution.value.set(w, h);
  }, [size.width, size.height, gl, depthRT, customUniforms]);

  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    meshRef.current.visible = false;
    gl.setRenderTarget(depthRT);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    meshRef.current.visible = true;
  }, -1);

  useFrame(({ clock, camera }) => {
    customUniforms.uTime.value = clock.getElapsedTime();
    if (camera instanceof THREE.PerspectiveCamera) {
      customUniforms.cameraNear.value = camera.near;
      customUniforms.cameraFar.value = camera.far;
    }
  });

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
        onBeforeCompile={injectShader}
        customProgramCacheKey={() => `ocean-${MAX_WAVES}`}
        transparent
        roughness={0}
        depthWrite={true}
        side={THREE.FrontSide}
      />
    </mesh>
  );
};

export default OceanTile;
