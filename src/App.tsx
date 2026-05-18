import { Suspense } from "react";
import { Stats } from "@react-three/drei";
import Ocean from "./components/ocean/Ocean";
import Scene from "./components/graphics/Scene";
import { OceanProvider } from "./contexts/OceanContext";
import Boat from "./components/boat/Boat";
// import FloatingBody from "./components/physics/FloatingBody";



// Waves are defined in src/components/ocean/oceanConsts.ts → WAVE_LAYERS

// function BoatWithControls() {
//   const { sailLevelRef, steeringRef, transformRef, windAngleRef, windSpeedRef } = useBoat();
//   return (
//     <Vessel
//       width={6}
//       length={15}
//       draft={0.01}
//       mass={50000}
//       waterDrag={12.2}
//       maxSpeed={10}
//       maxRotSpeed={0.5}
//       position={[0, 0]}
//       initialHeading={Math.PI}
//       sailLevelRef={sailLevelRef}
//       steeringRef={steeringRef}
//       transformRef={transformRef}
//       windAngleRef={windAngleRef}
//       windSpeedRef={windSpeedRef}
//       stiffness={.01}
//     >
//       <Boat scale={0.01} position={[5, 1, 0]} />
//     </Vessel>
//   );
// }

export default function App() {
  // const posXRef = useRef<number>(0);
  // const posZRef = useRef<number>(0);
  // const headingRef = useRef<number>(0);

  return (

    <div style={{ width: "100vw", height: "100vh" }}>
      <Scene>
        <Suspense fallback={null}>
          <OceanProvider>
            <Ocean />
            {/* <FloatingBody width={10} length={10} posXRef={posXRef} posZRef={posZRef} headingRef={headingRef} /> */}
            <Boat />
          </OceanProvider>
        </Suspense>
        <Stats />
      </Scene>
    </div>
  );
}
