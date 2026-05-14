import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Sky } from "@react-three/drei";
import * as THREE from "three";
import Boat from "./components/Boat";
import type { WaveLayer } from "./types/wave";
import Terrain from "./components/Terrain";
import OceanTile from "./components/OceanTile";
import SceneDepthCapture from "./components/SceneDepthCapture";

// Vagues porteuses — longue période, direction du courant
const CARRIER_WAVES: WaveLayer[] = [
  {
    direction: [1.0, 0.3],
    amplitude: 0.3,
    steepness: 0.9,
    wavelength: 20.0,
    speed: 0.2,
    warpStrength: 1,
  },
  {
    direction: [1.5, 0.8],
    amplitude: 0.9,
    steepness: 0.6,
    wavelength: 15.0,
    speed: 0.2,
    warpStrength: 1,
  },
  {
    direction: [0.5, 1.2],
    amplitude: 0.2,
    steepness: 0.6,
    wavelength: 15.0,
    speed: 0.2,
    warpStrength: 1,
  },
];

// Vaguelettes — direction du vent, amplitude modulée par les portantes
const SECONDARY_WAVES: WaveLayer[] = [
  {
    direction: [-1.0, -0.3],
    amplitude: 0.1,
    steepness: 2.9,
    wavelength: 5.0,
    speed: 0.5,
    warpStrength: 1,
  },
  {
    direction: [-1.5, -0.3],
    amplitude: 0.05,
    steepness: 0.9,
    wavelength: 5.0,
    speed: 0.2,
    warpStrength: 1,
  },
];

const SUN_POSITION: [number, number, number] = [100, 30, 100];

export default function App() {
  const depthTexRef = useRef<THREE.DepthTexture | null>(null);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        camera={{ position: [0, 5, 14], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        shadows="soft"
      >
        <SceneDepthCapture depthTexRef={depthTexRef} />

        <Sky
          sunPosition={SUN_POSITION}
          turbidity={6}
          rayleigh={1.5}
          mieCoefficient={0.004}
          mieDirectionalG={0.85}
        />

        <ambientLight intensity={10} color="#1a2a4a" />
        <directionalLight
          position={SUN_POSITION}
          intensity={2.0}
          color="#fff5e0"
          castShadow
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
          shadow-camera-near={1}
          shadow-camera-far={400}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.002}
        />

        <Suspense fallback={null}>
          <Boat position={[0, -0.8, 10]} scale={1} />
          <Terrain heightScale={4} terrainDepth={-3} />
          <OceanTile
            depthTexRef={depthTexRef}
            carrierWaves={CARRIER_WAVES}
            secondaryWaves={SECONDARY_WAVES}
            modulationStrength={0.7}
            secondaryNoiseScale={0.1}
            secondaryNoiseStrength={1}
            detailFBmStrength={0.2}
            detailFBmSpeed={1}
            terrainDamping={3.9}
            sunDirection={SUN_POSITION}
            normalScale={0.1}
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
