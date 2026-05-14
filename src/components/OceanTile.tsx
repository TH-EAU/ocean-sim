import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { WaveLayer } from "../types/wave";
import waterUniformsChunk from "./shaders/chunks/oceanUniforms.vert.chunk.glsl?raw";
import waterHelpersChunk from "./shaders/chunks/oceanHelpers.vert.chunk.glsl?raw";
import waterVertexChunk from "./shaders/chunks/ocean.vert.chunk.glsl?raw";
import waterColorChunk from "./shaders/chunks/oceanColor.frag.chunk.glsl?raw";
import colorHelpersChunk from "./shaders/chunks/oceanColorHelpers.frag.chunk.glsl?raw";
import heightmapUrl from "../assets/heightmap.jpg?url";

import normalMapUrl from "../assets/waterNormal.jpg?url";

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
      uDepthTexture: { value: null as THREE.Texture | null },
      uDepthFade: { value: 0.5 },
      uDepthScale: { value: 5.0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000 },
    };
  }, []);

  const applyVertexChunk = useCallback(
    (shader: THREE.WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, customUniforms);
      shader.vertexShader = (
        `#define MAX_WAVES ${MAX_WAVES}\n` + shader.vertexShader
      )
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
          `#include <common>\nuniform vec3 uSunDirection;\nuniform sampler2D uDepthTexture;\nuniform float uDepthFade;\nuniform float uDepthScale;\nuniform vec2 uResolution;\nuniform float cameraNear;\nuniform float cameraFar;\nuniform sampler2D uNormalMap;\nuniform float uNormalStrength;\nuniform float uNormalScale;\nuniform float uNormalWarp;\nuniform float uTime;\nvarying vec3 vWorldPos;\n${colorHelpersChunk}`,
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
