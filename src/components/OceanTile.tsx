import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { WaveLayer } from "../types/wave";
import waterUniformsChunk from "./shaders/chunks/oceanUniforms.vert.chunk.glsl";
import waterHelpersChunk from "./shaders/chunks/oceanHelpers.vert.chunk.glsl";
import waterVertexChunk from "./shaders/chunks/ocean.vert.chunk.glsl";
import heightmapUrl from "../assets/heightmap.png?url";

const MAX_WAVES = 8;
const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);
const DEFAULT_WIND_DIR: [number, number] = [-0.8, -0.8];
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
}: OceanTileProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const injectShader = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, customUniforms);

    shader.vertexShader = (
      `#define MAX_WAVES ${MAX_WAVES}\n` + shader.vertexShader
    )
      .replace(
        `#include <common>`,
        `#include <common>\n${waterUniformsChunk}\n${waterHelpersChunk}`,
      )
      .replace(`#include <begin_vertex>`, waterVertexChunk);
    // Debug
    console.log(
      shader.vertexShader
        .split("\n")
        .map((line, i) => `${String(i + 1).padStart(3, " ")} | ${line}`)
        .join("\n"),
    );
  };

  const depthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    mat.onBeforeCompile = injectShader;
    mat.customProgramCacheKey = () => `ocean-depth-${MAX_WAVES}`;
    return mat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
