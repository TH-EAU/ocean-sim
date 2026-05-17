import { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Boat from "./components/Boat";
import FloatingBody from "./components/FloatingBody";
import Terrain from "./components/Terrain";
import Ocean from "./components/ocean/Ocean";
import BoatCamera from "./components/BoatCamera";
import BoatHUD from "./components/BoatHUD";
import { BoatProvider, useBoat } from "./contexts/BoatContext";

const SUN_POSITION: [number, number, number] = [100, 10, 100];
const BASE_WIND_SPEED = 5;

function BoatWithControls() {
  const { thrustRef, steeringRef, transformRef, windAngleRef, windSpeedRef } = useBoat();
  return (
    <FloatingBody
      width={6}
      length={20}
      draft={-1.1}
      damping={0.05}
      position={[0, 0]}
      initialHeading={Math.PI}
      thrustRef={thrustRef}
      steeringRef={steeringRef}
      transformRef={transformRef}
      windAngleRef={windAngleRef}
      windSpeedRef={windSpeedRef}

    >
      <Boat scale={0.01} position={[5, 0, 0]} />
    </FloatingBody>
  );
}

export default function App() {
  // Refs created at App level — shared between Ocean (writes) and BoatProvider (reads)
  const windAngleRef = useRef<number>(Math.PI);
  const windSpeedRef = useRef<number>(BASE_WIND_SPEED);
  const orbitControlsRef = useRef<any>(null);

  return (
    <BoatProvider windAngleRef={windAngleRef} windSpeedRef={windSpeedRef}>
      <div style={{ width: "100vw", height: "100vh" }}>
        <Canvas
          camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 1000 }}
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
            <Physics gravity={[0, -9.81, 0]}>
              <Terrain heightScale={34} terrainDepth={-22} />
              <Ocean
                disturbtion={3}
                windSpeed={BASE_WIND_SPEED}
                windAngleRef={windAngleRef}
                windSpeedRef={windSpeedRef}
              >
                <BoatWithControls />
              </Ocean>
              <BoatCamera
                orbitControlsRef={orbitControlsRef}
                distance={8}
                height={2}
                lookAhead={6}
                smoothing={0.3}
              />
            </Physics>
          </Suspense>

          <OrbitControls
            ref={orbitControlsRef}
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={1145}
            maxPolarAngle={Math.PI / 2.1}
          />
          <Stats />
        </Canvas>
        <BoatHUD />
      </div>
    </BoatProvider>
  );
}
