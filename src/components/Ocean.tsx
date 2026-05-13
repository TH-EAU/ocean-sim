import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { WaveLayer } from "../types/wave";
import vertexShader from "./shaders/ocean.vert.glsl?raw";
import fragmentShader from "./shaders/ocean.frag.glsl?raw";
import heightmapUrl from "../assets/heightmap.png?url";
import normalMapUrl from "../assets/Water 0341normal.jpg?url";

const MAX_WAVES = 8;

const LIGHT_DIR = new THREE.Vector3(100, 30, 100).normalize();
const LIGHT_COLOR = new THREE.Color(1.0, 0.95, 0.88);
const AMBIENT = new THREE.Color(0.08, 0.12, 0.18);
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

interface OceanProps {
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
  fresnelStrength?: number;
  fresnelAlpha?: number;
  waterDensity?: number;
  transmission?: number;
  scatterDensity?: number;
  scatterPower?: number;
  fogColor?: string;
  fogDensity?: number;
  normalStrength?: number;
  normalScale?: number;
  normalWarp?: number;
}

export default function Ocean({
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
  fresnelStrength = 1.0,
  fresnelAlpha = 1.0,
  waterDensity = 2.0,
  transmission = 1.5,
  scatterDensity = 8.0,
  scatterPower = 4.0,
  fogColor = "#94bfe9",
  fogDensity = 0.018,
  normalStrength = 0.4,
  normalScale = 0.5,
  normalWarp = 0.25,
}: OceanProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

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

  useEffect(() => {
    const allWaves = [...carrierWaves, ...secondaryWaves];
    fillWaveBuffers(allWaves, dirs, amps, steeps, lens, speeds, warps);
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uNumCarrierWaves.value = carrierWaves.length;
    u.uNumSecondaryWaves.value = secondaryWaves.length;
  }, [carrierWaves, secondaryWaves, dirs, amps, steeps, lens, speeds, warps]);

  // Created once — Float32Arrays and textures are stable refs; props synced via useEffect below
  // Spreads THREE.UniformsLib.lights so Three.js can update shadow map uniforms when lights=true

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => {
    const allWaves = [...carrierWaves, ...secondaryWaves];
    fillWaveBuffers(allWaves, dirs, amps, steeps, lens, speeds, warps);
    return {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
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
      uFresnelStrength: { value: fresnelStrength },
      uFresnelAlpha: { value: fresnelAlpha },
      uWaterDensity: { value: waterDensity },
      uTransmission: { value: transmission },
      uScatterDensity: { value: scatterDensity },
      uScatterPower: { value: scatterPower },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogDensity: { value: fogDensity },
      uNormalMap: { value: normalMap },
      uNormalStrength: { value: normalStrength },
      uNormalScale: { value: normalScale },
      uNormalWarp: { value: normalWarp },
      uLightDir: { value: LIGHT_DIR },
      uLightColor: { value: LIGHT_COLOR },
      uAmbientColor: { value: AMBIENT },
    };
  }, []);

  useEffect(() => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uModulationStrength.value = modulationStrength;
    u.uSecondaryNoiseScale.value = secondaryNoiseScale;
    u.uSecondaryNoiseStrength.value = secondaryNoiseStrength;
  }, [modulationStrength, secondaryNoiseScale, secondaryNoiseStrength]);

  useEffect(() => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uDetailFBmScale.value = detailFBmScale;
    u.uDetailFBmStrength.value = detailFBmStrength;
    u.uDetailFBmSpeed.value = detailFBmSpeed;
    u.uDetailWindDir.value.set(detailWindDir[0], detailWindDir[1]);
  }, [detailFBmScale, detailFBmStrength, detailFBmSpeed, detailWindDir]);

  useEffect(() => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTerrainDamping.value = terrainDamping;
    u.uFresnelStrength.value = fresnelStrength;
    u.uFresnelAlpha.value = fresnelAlpha;
    u.uWaterDensity.value = waterDensity;
    u.uTransmission.value = transmission;
    u.uScatterDensity.value = scatterDensity;
    u.uScatterPower.value = scatterPower;
    u.uFogDensity.value = fogDensity;
    u.uNormalStrength.value = normalStrength;
    u.uNormalScale.value = normalScale;
    u.uNormalWarp.value = normalWarp;
  }, [
    terrainDamping,
    fresnelStrength,
    fresnelAlpha,
    waterDensity,
    transmission,
    scatterDensity,
    scatterPower,
    fogDensity,
    normalStrength,
    normalScale,
    normalWarp,
  ]);

  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uFogColor.value.set(fogColor);
  }, [fogColor]);

  useFrame(({ clock }) => {
    if (matRef.current)
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60, 256, 256]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        defines={{ MAX_WAVES }}
        transparent
        depthWrite={true}
        side={THREE.FrontSide}
        lights={true}
      />
    </mesh>
  );
}
