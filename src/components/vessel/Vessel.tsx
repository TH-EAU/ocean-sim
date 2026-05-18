import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { BoatTransform } from "@customTypes/boat";
import FloatingBody from "../physics/FloatingBody";

const DT = 1 / 60;
const HD = 0.5;
const BASE_WIND_SPEED = 5;
const ANGULAR_ACCEL = 0.0012;
const ANGULAR_DRAG = 0.90;
const RADIUS_FACTOR = 3.0;

interface VesselProps {
  children: React.ReactNode;
  width?: number;
  length?: number;
  draft?: number;
  mass?: number;
  waterDrag?: number;
  stiffness?: number;
  modelYaw?: number;
  sailLevelRef: React.RefObject<number>;
  steeringRef: React.RefObject<number>;
  windAngleRef?: React.RefObject<number>;
  windSpeedRef?: React.RefObject<number>;
  maxSpeed?: number;
  maxRotSpeed?: number;
  position?: [number, number];
  initialHeading?: number;
  transformRef?: React.RefObject<BoatTransform>;
}

export default function Vessel({
  children,
  width = 6,
  length = 20,
  draft = 0.5,
  mass = 5000,
  waterDrag = 1.2,
  stiffness = 2,
  modelYaw = 0,
  sailLevelRef,
  steeringRef,
  windAngleRef,
  windSpeedRef,
  maxSpeed = 5,
  maxRotSpeed = 0.5,
  position = [0, 0],
  initialHeading = 0,
  transformRef,
}: VesselProps) {
  const posXRef = useRef<number>(position[0]);
  const posZRef = useRef<number>(position[1]);
  const headingRef = useRef<number>(initialHeading);

  const velX = useRef(0);
  const velZ = useRef(0);
  const velHeading = useRef(0);

  useFrame(() => {
    const cosH = Math.cos(headingRef.current);
    const sinH = Math.sin(headingRef.current);
    const forwardSpeed = velX.current * cosH - velZ.current * sinH;

    // Steering — radius grows with speed
    const angAccel = ANGULAR_ACCEL / (1 + Math.abs(forwardSpeed) * RADIUS_FACTOR);
    velHeading.current += steeringRef.current * angAccel;
    velHeading.current *= ANGULAR_DRAG;
    // Max rotation speed clamp (rad/frame)
    const maxRotFrame = maxRotSpeed * DT;
    velHeading.current = Math.max(-maxRotFrame, Math.min(maxRotFrame, velHeading.current));
    headingRef.current += velHeading.current;

    // Horizontal drag
    const hDamp = Math.exp(-HD * DT);
    velX.current *= hDamp;
    velZ.current *= hDamp;

    // Sail thrust
    const sailFactor = (sailLevelRef.current ?? 0) / 3;
    if (sailFactor > 0) {
      const windAngle = windAngleRef?.current ?? 0;
      const windSpeed = windSpeedRef?.current ?? BASE_WIND_SPEED;
      const angularEff = 0.75 + 0.25 * Math.cos(windAngle - headingRef.current);
      const windNorm = Math.min(windSpeed / BASE_WIND_SPEED, 2.0);
      const thrustAcc = HD * maxSpeed * windNorm * angularEff * sailFactor;
      velX.current += thrustAcc * DT * cosH;
      velZ.current += thrustAcc * DT * -sinH;
    }

    // Integration
    posXRef.current += velX.current * DT;
    posZRef.current += velZ.current * DT;
  });

  return (
    <FloatingBody
      posXRef={posXRef}
      posZRef={posZRef}
      headingRef={headingRef}
      width={width}
      length={length}
      draft={draft}
      mass={mass}
      waterDrag={waterDrag}
      stiffness={stiffness}
      modelYaw={modelYaw}
      transformRef={transformRef}
    >
      {children}
    </FloatingBody>
  );
}
