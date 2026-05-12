import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Sky } from "@react-three/drei";
import Ocean from "./components/Ocean";
import Terrain from "./components/Terrain";
import type { WaveLayer } from "./types/wave";

const WAVES: WaveLayer[] = [
  {
    direction: [1.0, 0.3],
    amplitude: 0.05,
    steepness: 1.9,
    wavelength: 4.0,
    speed: 0.2,
    warpStrength: 1,
  },
  {
    direction: [1.3, 0.3],
    amplitude: 0.1,
    steepness: 1.9,
    wavelength: 4.0,
    speed: 0.2,
    warpStrength: 5,
  },
  {
    direction: [1.0, 0.1],
    amplitude: 0.001,
    steepness: 1.9,
    wavelength: 0.5,
    speed: 0.7,
    warpStrength: 2,
  },
];

const SUN_POSITION: [number, number, number] = [100, 30, 100];

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        camera={{ position: [0, 5, 14], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
      >
        <Sky
          sunPosition={SUN_POSITION}
          turbidity={6}
          rayleigh={1.5}
          mieCoefficient={0.004}
          mieDirectionalG={0.85}
        />

        <ambientLight intensity={0.3} color="#1a2a4a" />
        <directionalLight
          position={SUN_POSITION}
          intensity={2.0}
          color="#fff5e0"
          castShadow={false}
        />

        <Suspense fallback={null}>
          <Terrain heightScale={4} terrainDepth={-1} />
          <Ocean
            waves={WAVES}
            terrainDamping={3.9}
            fresnelStrength={3.9}
            fresnelAlpha={1}
            waterDensity={1}
            transmission={0.9}
            scatterDensity={8}
            scatterPower={4}
          />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={45}
          maxPolarAngle={Math.PI / 2.1}
        />
        <Stats />
      </Canvas>
    </div>
  );
}
