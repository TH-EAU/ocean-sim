import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Sky } from "@react-three/drei";
import Boat from "./components/Boat";
import Terrain from "./components/Terrain";
import OceanGrid from "./components/ocean/OceanGrid";
import Ocean from "./components/ocean/Ocean";

const SUN_POSITION: [number, number, number] = [100, 30, 100];

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        camera={{ position: [0, 5, 14], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        shadows="soft"
      >
        <Sky
          sunPosition={SUN_POSITION}
          turbidity={6}
          rayleigh={1.5}
          mieCoefficient={0.004}
          mieDirectionalG={0.85}
        />

        <ambientLight intensity={3.3} color="#1a2a4a" />
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
          <Terrain heightScale={34} terrainDepth={-22} />
          {/* <AbsorbTest /> */}
          {/*<Ocean
            carrierWaves={CARRIER_WAVES}
            secondaryWaves={SECONDARY_WAVES}
            modulationStrength={0.7}
            terrainDamping={3.9}
            fresnelStrength={3.9}
            fresnelAlpha={1}
            waterDensity={1}
            transmission={0.9}
            scatterDensity={8}
            scatterPower={4}
            secondaryNoiseScale={0.1}
            secondaryNoiseStrength={1}
            detailFBmStrength={0.2}
            detailFBmSpeed={1}
          />*/}
          {/* <OceanGrid disturbtion={2.5} /> */}
          <Ocean />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={1145}
          maxPolarAngle={Math.PI / 2.1}
        />
        <Stats />
      </Canvas>
    </div>
  );
}
