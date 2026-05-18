import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BoatTransform } from "../types/boat";
import { useOcean } from "./ocean/OceanContext";
import { sampleOceanY } from "./ocean/oceanUtils/gerstner";
import { sampleTerrainY } from "./ocean/oceanUtils/terrainSampler";

const DRIFT_FORCE   = 0.015;
const SPEED_DRAG    = 0.992;  // half-life ~86 frames (1.4s)
const GYRO          = 0.4;
const ANGULAR_ACCEL = 0.0012; // angular acceleration per frame from rudder
const ANGULAR_DRAG  = 0.85;   // angular velocity decay per frame
const RADIUS_FACTOR = 3.0;    // higher = wider turning radius at speed
const ANGULAR_SMOOTH = 0.008;
const WIND_ROLL_THRESHOLD = 4;                        // m/s below which wind has no effect
const WIND_ROLL_EXTRA = 15 * Math.PI / 180;        // 15° extra roll
const PERP_THRESHOLD = Math.sin(80 * Math.PI / 180); // ≈ 0.985 (±10° around perpendicular)

const UP = new THREE.Vector3(0, 1, 0);
const ARROW_COLOR = 0xffff00;

const CORNERS: [1 | -1, 1 | -1][] = [
  [1, -1],
  [1, 1],
  [-1, -1],
  [-1, 1],
];

interface FloatingBodyProps {
  children: React.ReactNode;
  width?: number;
  length?: number;
  draft?: number;
  damping?: number;
  stiffness?: number;
  position?: [number, number];
  initialHeading?: number;
  modelYaw?: number;
  thrustRef?: React.RefObject<number>;
  steeringRef?: React.RefObject<number>;
  transformRef?: React.RefObject<BoatTransform>;
  windAngleRef?: React.RefObject<number>;
  windSpeedRef?: React.RefObject<number>;
}

export default function FloatingBody({
  children,
  width = 4,
  length = 10,
  draft = 0.5,
  damping = 0.92,
  stiffness = 0.08,
  position = [0, 0],
  initialHeading = 0,
  modelYaw = 0,
  thrustRef,
  steeringRef,
  transformRef,
  windAngleRef,
  windSpeedRef,
}: FloatingBodyProps) {
  const posRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const headingRef = useRef(initialHeading);
  const { disturbtion, currentDirection, waveLayers } = useOcean();

  const posX = useRef(position[0]);
  const posZ = useRef(position[1]);
  const posY = useRef(0);
  const pitch = useRef(0);
  const roll = useRef(0);
  const velY = useRef(0);
  const velPitch = useRef(0);
  const velRoll = useRef(0);
  const velX       = useRef(0);
  const velZ       = useRef(0);
  const velHeading = useRef(0);
  const smoothPitch = useRef(0);
  const smoothRoll  = useRef(0);

  const arrows = useMemo(
    () => CORNERS.map(() => new THREE.ArrowHelper(UP, new THREE.Vector3(), 1, ARROW_COLOR)),
    [],
  );

  const _euler = useMemo(() => new THREE.Euler(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const H = headingRef.current;

    // ── Steering — angular momentum, wider radius at speed ───────────────────
    const forwardSpeed = velX.current * Math.cos(H) - velZ.current * Math.sin(H);
    const angAccel     = ANGULAR_ACCEL / (1 + Math.abs(forwardSpeed) * RADIUS_FACTOR);
    velHeading.current += (steeringRef?.current ?? 0) * angAccel;
    velHeading.current *= ANGULAR_DRAG;
    headingRef.current += velHeading.current;

    const cosH = Math.cos(headingRef.current);
    const sinH = Math.sin(headingRef.current);
    const bowX = cosH * length / 2;
    const bowZ = -sinH * length / 2;
    const stbdX = sinH * width / 2;
    const stbdZ = cosH * width / 2;

    const cx = posX.current;
    const cz = posZ.current;

    const sample = (x: number, z: number) =>
      sampleOceanY(x, z, currentDirection, disturbtion, t, waveLayers);

    const hBP = sample(cx + bowX - stbdX, cz + bowZ - stbdZ);
    const hBS = sample(cx + bowX + stbdX, cz + bowZ + stbdZ);
    const hSP = sample(cx - bowX - stbdX, cz - bowZ - stbdZ);
    const hSS = sample(cx - bowX + stbdX, cz - bowZ + stbdZ);
    const heights = [hBP, hBS, hSP, hSS];

    const frontAvg = (hBP + hBS) / 2;
    const backAvg = (hSP + hSS) / 2;
    const portAvg = (hBP + hSP) / 2;
    const stbdAvg = (hBS + hSS) / 2;
    const mean = (hBP + hBS + hSP + hSS) / 4;

    const targetY = mean - draft;
    const targetPitch = Math.atan2(frontAvg - backAvg, length);
    const targetRoll = Math.atan2(stbdAvg - portAvg, width);

    // Wind-induced roll — only when wind is near-perpendicular to heading (±10°)
    const windAngle = windAngleRef?.current ?? 0;
    const windSpeed = windSpeedRef?.current ?? 0;
    const sinA = Math.sin(windAngle - headingRef.current);
    let finalTargetRoll = targetRoll;
    if (Math.abs(sinA) > PERP_THRESHOLD && windSpeed > WIND_ROLL_THRESHOLD) {
      const windFactor = Math.min(1, (windSpeed - WIND_ROLL_THRESHOLD) / 2);
      finalTargetRoll += Math.sign(sinA) * WIND_ROLL_EXTRA * windFactor;
    }

    // Low-pass filter on angular targets before spring (reduces choppiness)
    smoothPitch.current += (targetPitch - smoothPitch.current) * ANGULAR_SMOOTH;
    smoothRoll.current += (finalTargetRoll - smoothRoll.current) * ANGULAR_SMOOTH;

    const speed = Math.hypot(velX.current, velZ.current);
    const gyroFactor = 1 / (1 + speed * GYRO);
    const effectiveStiffness = stiffness * gyroFactor;

    velPitch.current = velPitch.current * damping + (smoothPitch.current - pitch.current) * effectiveStiffness;
    velRoll.current = velRoll.current * damping + (smoothRoll.current - roll.current) * effectiveStiffness;
    velY.current = velY.current * damping + (targetY - posY.current) * stiffness;

    pitch.current += velPitch.current;
    roll.current += velRoll.current;
    posY.current += velY.current;

    // Terrain collision — clamp hull bottom above ground
    const groundY = sampleTerrainY(posX.current, posZ.current);
    const minY = groundY + draft;
    if (posY.current < minY) {
      posY.current = minY;
      velY.current = Math.max(0, velY.current);
    }

    // ── Wave drift ───────────────────────────────────────────────────────────
    const fwdDrift = -Math.sin(pitch.current) * DRIFT_FORCE;
    const sideDrift = -Math.sin(roll.current) * DRIFT_FORCE;

    velX.current = velX.current * SPEED_DRAG + fwdDrift * cosH + sideDrift * sinH;
    velZ.current = velZ.current * SPEED_DRAG - fwdDrift * sinH + sideDrift * cosH;

    // ── Wind thrust — forward force in heading direction ─────────────────────
    const thrust = thrustRef?.current ?? 0;
    velX.current += thrust * cosH;
    velZ.current += thrust * -sinH;

    posX.current += velX.current;
    posZ.current += velZ.current;

    // ── Apply to Three.js groups directly — zero lag, no physics engine step ─
    if (posRef.current) {
      posRef.current.position.set(posX.current, posY.current, posZ.current);
      _euler.set(0, headingRef.current, 0);
      posRef.current.quaternion.setFromEuler(_euler);
    }
    if (tiltRef.current) {
      tiltRef.current.rotation.set(-roll.current, 0, pitch.current);
    }

    // ── Write world transform for camera ─────────────────────────────────────
    if (transformRef) {
      transformRef.current = {
        x: posX.current,
        y: posY.current,
        z: posZ.current,
        heading: headingRef.current,
        pitch: pitch.current,
        roll: roll.current,
      };
    }

    // ── Debug arrows — world-space corners ───────────────────────────────────
    CORNERS.forEach(([ls, ws], i) => {
      const wx = cx + ls * bowX + ws * stbdX;
      const wz = cz + ls * bowZ + ws * stbdZ;
      const h = heights[i];
      arrows[i].position.set(wx, h, wz);
      arrows[i].setLength(Math.max(0.2, Math.abs(h) + 0.5));
    });
  });

  return (
    <>
      <group ref={posRef}>
        <group ref={tiltRef}>
          <group rotation={[0, modelYaw, 0]}>{children}</group>
          <mesh>
            <boxGeometry args={[length, 2, width]} />
            <meshBasicMaterial color={0xffff00} wireframe />
          </mesh>
        </group>
      </group>
      {arrows.map((a, i) => <primitive key={i} object={a} />)}
    </>
  );
}
