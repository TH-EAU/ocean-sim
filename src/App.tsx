import { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import Boat from "./components/Boat";
import FloatingBody from "./components/FloatingBody";
import Terrain from "./components/Terrain";
import Ocean from "./components/ocean/Ocean";
import BoatCamera from "./components/BoatCamera";
import BoatHUD from "./components/BoatHUD";
import SceneLighting from "./components/SceneLighting";
import BakedSky from "./components/BakedSky";
import { BoatProvider, useBoat } from "./contexts/BoatContext";

const BASE_WIND_SPEED = 5;
// Waves are defined in src/components/ocean/oceanConsts.ts → DEFAULT_WAVE_LAYERS

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
          <BakedSky />

          <ambientLight intensity={3.3} color="#1a2a4a" />
          <SceneLighting />

          <Suspense fallback={null}>
            <Terrain heightScale={4} terrainDepth={-2} />
            <Ocean
              disturbtion={5}
              windSpeed={BASE_WIND_SPEED}
              windAngleRef={windAngleRef}
              windSpeedRef={windSpeedRef}
            >
              <BoatWithControls />
            </Ocean>
            <BoatCamera
              orbitControlsRef={orbitControlsRef}
              distance={8}
              height={3}
              lookAhead={6}
              smoothing={0.3}
            />
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
