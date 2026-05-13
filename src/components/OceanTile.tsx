import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { WaveLayer } from "../types/wave";
import waterUniformsChunk from "./shaders/chunks/oceanUniforms.vert.chunk.glsl?raw";
import waterHelpersChunk from "./shaders/chunks/oceanHelpers.vert.chunk.glsl?raw";
import waterVertexChunk from "./shaders/chunks/ocean.vert.chunk.glsl?raw";
import waterColorChunk from "./shaders/chunks/oceanColor.frag.chunk.glsl?raw";
import heightmapUrl from "../assets/heightmap.png?url";

import normalMapUrl from "../assets/Water 0341normal.jpg?url";

const MAX_WAVES = 8;
const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
const DEFAULT_WIND_DIR: [number, number] = [-0.8, -0.8];
const DEFAULT_SUN_DIR: [number, number, number] = [100, 10, 100];
const EMPTY_WAVES: WaveLayer[] = [];

function fillWaveBuffers(
  waves: WaveLayer[],
  dirs: Float32Array,
  amps: Float32Array,
  steeps: Float32Array,
  lens: Float32Array,
  speeds: Float32Array,
  warps: Float32Array,
) {
  dirs.fill(0);
  amps.fill(0);
  steeps.fill(0);
  lens.fill(1);
  speeds.fill(0);
  warps.fill(0);
  waves.forEach((w, i) => {
    if (i >= MAX_WAVES) return;
    dirs[i * 2] = w.direction[0];
    dirs[i * 2 + 1] = w.direction[1];
    amps[i] = w.amplitude;
    steeps[i] = w.steepness;
    lens[i] = w.wavelength;
    speeds[i] = w.speed;
    warps[i] = w.warpStrength ?? 0;
  });
}

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
  sunDirection = DEFAULT_SUN_DIR,
  normalStrength = 0.4,
  normalScale = 0.5,
  normalWarp = 0.25,
}: OceanTileProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const normalMap = useTexture(normalMapUrl, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
  });

  const heightmap = useTexture(heightmapUrl, (tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  });

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
    };
  }, []);

  const applyVertexChunk = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, customUniforms);
      shader.vertexShader = (`#define MAX_WAVES ${MAX_WAVES}\n` + shader.vertexShader)
        .replace(
          `#include <common>`,
          `#include <common>\n${waterUniformsChunk}\n${waterHelpersChunk}`,
        )
        .replace(`#include <begin_vertex>`, waterVertexChunk);
    },
    [customUniforms],
  );

  const injectShader = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      applyVertexChunk(shader);
      shader.vertexShader = `#define OCEAN_USE_NORMALS\n` + shader.vertexShader;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          `#include <common>`,
          `#include <common>\nuniform vec3 uSunDirection;\nvarying vec3 vWorldPos;`,
        )
        .replace(
          `#include <map_fragment>`,
          `#include <map_fragment>\n${waterColorChunk}`,
        );
    },
    [customUniforms, applyVertexChunk],
  );

  const depthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    mat.onBeforeCompile = applyVertexChunk;
    mat.customProgramCacheKey = () => `ocean-depth-${MAX_WAVES}`;
    return mat;
  }, [applyVertexChunk]);

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
    customUniforms.uSunDirection.value
      .set(sunDirection[0], sunDirection[1], sunDirection[2])
      .normalize();
  }, [sunDirection, customUniforms]);

  useEffect(() => {
    customUniforms.uNormalStrength.value = normalStrength;
    customUniforms.uNormalScale.value = normalScale;
    customUniforms.uNormalWarp.value = normalWarp;
  }, [normalStrength, normalScale, normalWarp, customUniforms]);

  useFrame(({ clock }) => {
    customUniforms.uTime.value = clock.getElapsedTime();
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
        depthWrite={true}
        side={THREE.FrontSide}
      />
    </mesh>
  );
};

export default OceanTile;
