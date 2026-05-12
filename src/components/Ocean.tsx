import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import type { WaveLayer } from "../types/wave";
import vertexShader   from "./shaders/ocean.vert.glsl?raw";
import fragmentShader from "./shaders/ocean.frag.glsl?raw";
import heightmapUrl   from "../assets/heightmap.png?url";
import normalMapUrl   from "../assets/Water 0341normal.jpg?url";

const MAX_WAVES = 8;

const SUN_POS        = new THREE.Vector3(100, 30, 100);
const LIGHT_DIR      = SUN_POS.clone().normalize();
const LIGHT_COLOR    = new THREE.Color(1.0, 0.95, 0.88);
const AMBIENT        = new THREE.Color(0.08, 0.12, 0.18);
const TERRAIN_BOUNDS = new THREE.Vector4(-30, -30, 30, 30);

function fillWaveBuffers(
  waves: WaveLayer[],
  dirs: Float32Array, amps: Float32Array,
  steeps: Float32Array, lens: Float32Array,
  speeds: Float32Array, warps: Float32Array,
) {
  dirs.fill(0); amps.fill(0); steeps.fill(0); lens.fill(1); speeds.fill(0); warps.fill(0);
  waves.forEach((w, i) => {
    if (i >= MAX_WAVES) return;
    dirs[i * 2]     = w.direction[0];
    dirs[i * 2 + 1] = w.direction[1];
    amps[i]   = w.amplitude;
    steeps[i] = w.steepness;
    lens[i]   = w.wavelength;
    speeds[i] = w.speed;
    warps[i]  = w.warpStrength ?? 0;
  });
}

interface OceanProps {
  waves?:           WaveLayer[];
  terrainDamping?:  number;
  fresnelStrength?: number;
  fresnelAlpha?:    number;
  waterDensity?:    number;
  transmission?:    number;
  scatterDensity?:  number;
  scatterPower?:    number;
  fogColor?:        string;
  fogDensity?:      number;
  normalStrength?:  number;  // blend weight vs Gerstner normal (default 0.4)
  normalScale?:     number;  // world-units per normal map tile (default 0.5)
  normalWarp?:      number;  // domain-warp amplitude (default 0.25)
}

const DEFAULT_WAVES: WaveLayer[] = [
  { direction: [1.0, 0.3], amplitude: 0.2, steepness: 2.2, wavelength: 5.0, speed: 0.4, warpStrength: 1.0 },
];

export default function Ocean({
  waves           = DEFAULT_WAVES,
  terrainDamping  = 0.9,
  fresnelStrength = 1.0,
  fresnelAlpha    = 1.0,
  waterDensity    = 2.0,
  transmission    = 1.5,
  scatterDensity  = 8.0,
  scatterPower    = 4.0,
  fogColor        = "#94bfe9",
  fogDensity      = 0.018,
  normalStrength  = 0.4,
  normalScale     = 0.5,
  normalWarp      = 0.25,
}: OceanProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const normalMap = useTexture(normalMapUrl, (tex) => {
    tex.wrapS = tex.wrapT  = THREE.RepeatWrapping;
    tex.minFilter          = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate        = true;
  });

  const heightmap = useTexture(heightmapUrl, (tex) => {
    tex.minFilter       = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate     = true;
  });

  const dirs   = useMemo(() => new Float32Array(MAX_WAVES * 2), []);
  const amps   = useMemo(() => new Float32Array(MAX_WAVES), []);
  const steeps = useMemo(() => new Float32Array(MAX_WAVES), []);
  const lens   = useMemo(() => { const a = new Float32Array(MAX_WAVES); a.fill(1); return a; }, []);
  const speeds = useMemo(() => new Float32Array(MAX_WAVES), []);
  const warps  = useMemo(() => new Float32Array(MAX_WAVES), []);

  useMemo(() => fillWaveBuffers(waves, dirs, amps, steeps, lens, speeds, warps), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fillWaveBuffers(waves, dirs, amps, steeps, lens, speeds, warps);
  }, [waves, dirs, amps, steeps, lens, speeds, warps]);

  const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
    uTime:              { value: 0 },
    uWaveDirections:    { value: dirs },
    uWaveAmplitudes:    { value: amps },
    uWaveSteepnesses:   { value: steeps },
    uWaveWavelengths:   { value: lens },
    uWaveSpeeds:        { value: speeds },
    uWaveWarpStrengths: { value: warps },
    uHeightmap:         { value: heightmap },
    uTerrainBounds:     { value: TERRAIN_BOUNDS },
    uTerrainDamping:    { value: terrainDamping },
    uFresnelStrength:   { value: fresnelStrength },
    uFresnelAlpha:      { value: fresnelAlpha },
    uWaterDensity:      { value: waterDensity },
    uTransmission:      { value: transmission },
    uScatterDensity:    { value: scatterDensity },
    uScatterPower:      { value: scatterPower },
    uFogColor:          { value: new THREE.Color(fogColor) },
    uFogDensity:        { value: fogDensity },
    uNormalMap:         { value: normalMap },
    uNormalStrength:    { value: normalStrength },
    uNormalScale:       { value: normalScale },
    uNormalWarp:        { value: normalWarp },
    uSunDirection:      { value: LIGHT_DIR },
    uLightDir:          { value: LIGHT_DIR },
    uLightColor:        { value: LIGHT_COLOR },
    uAmbientColor:      { value: AMBIENT },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value           = clock.getElapsedTime();
    u.uTerrainDamping.value = terrainDamping;
    u.uFresnelStrength.value = fresnelStrength;
    u.uFresnelAlpha.value    = fresnelAlpha;
    u.uWaterDensity.value    = waterDensity;
    u.uTransmission.value    = transmission;
    u.uScatterDensity.value  = scatterDensity;
    u.uScatterPower.value    = scatterPower;
    u.uFogColor.value.set(fogColor);
    u.uFogDensity.value      = fogDensity;
    u.uNormalStrength.value  = normalStrength;
    u.uNormalScale.value     = normalScale;
    u.uNormalWarp.value      = normalWarp;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60, 512, 512]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        defines={{ MAX_WAVES }}
        transparent
        depthWrite={true}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
