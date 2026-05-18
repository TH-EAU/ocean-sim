import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { BoatTransform } from "@customTypes/boat";
import { useOcean } from "@ocean/OceanContext";
import { buildDerivedWaves, sampleOceanYRaw } from "@ocean/oceanUtils/gerstner";

const DT = 1 / 60;          // s — fixed timestep
const G = 9.81;              // m/s²
const RHO_WATER = 1025;      // kg/m³ (seawater)
const HD = 0.5;              // s⁻¹ — horizontal drag coefficient
const BASE_WIND_SPEED = 5;   // m/s — reference wind speed for maxSpeed
const DRIFT_FORCE = 0.9;     // m/s² — wave slope drift acceleration
const GYRO = 0.4;
const ANGULAR_ACCEL = 0.0012; // angular acceleration per frame from rudder
const ANGULAR_DRAG = 0.85;   // angular velocity decay per frame
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
  width?: number;       // m
  length?: number;      // m
  draft?: number;       // m — keel depth offset (positive = hull center above waterline)
  mass?: number;        // kg
  waterDrag?: number;   // s⁻¹ — vertical & angular damping coefficient
  stiffness?: number;   // angular spring stiffness (unitless, tuning param)
  maxSpeed?: number;    // m/s — terminal speed at BASE_WIND_SPEED, full sails, 0° angle
  position?: [number, number];
  initialHeading?: number;
  modelYaw?: number;
  sailLevelRef: React.RefObject<number>;
  steeringRef: React.RefObject<number>;
  transformRef?: React.RefObject<BoatTransform>;
  windAngleRef?: React.RefObject<number>;
  windSpeedRef?: React.RefObject<number>;
}

export default function FloatingBody({
  children,
  width = 4,
  length = 10,
  draft = 0.5,
  mass = 5000,
  waterDrag = 1.2,
  stiffness = 0.08,
  maxSpeed = 5,
  position = [0, 0],
  initialHeading = 0,
  modelYaw = 0,
  sailLevelRef,
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
  const velX = useRef(0);
  const velZ = useRef(0);
  const velHeading = useRef(0);
  const smoothPitch = useRef(0);
  const smoothRoll = useRef(0);

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
    const angAccel = ANGULAR_ACCEL / (1 + Math.abs(forwardSpeed) * RADIUS_FACTOR);
    velHeading.current += steeringRef.current * angAccel;
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

    const derived = buildDerivedWaves(currentDirection, disturbtion, waveLayers);
    const sample = (x: number, z: number) => sampleOceanYRaw(x, z, derived, t);

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
    // Hull plane normal from the 4 corner 3D positions — correct for coupled pitch+roll
    const fwdX = 2 * bowX,  fwdY = frontAvg - backAvg, fwdZ = 2 * bowZ;
    const rgtX = 2 * stbdX, rgtY = stbdAvg - portAvg,  rgtZ = 2 * stbdZ;
    const nx = rgtY * fwdZ - rgtZ * fwdY;
    const ny = rgtZ * fwdX - rgtX * fwdZ; // = width×length > 0
    const nz = rgtX * fwdY - rgtY * fwdX;
    const nFwd  = nx * cosH + nz * (-sinH);
    const nRght = nx * sinH + nz *   cosH;
    const targetPitch = Math.atan2(-nFwd,  ny);
    const targetRoll  = Math.atan2( nRght, ny);

    // Wind-induced roll — only when wind is near-perpendicular to heading (±10°)
    const windAngle = windAngleRef?.current ?? 0;
    const windSpeed = windSpeedRef?.current ?? 0;
    const sinA = Math.sin(windAngle - headingRef.current);
    let finalTargetRoll = targetRoll;
    if (Math.abs(sinA) > PERP_THRESHOLD && windSpeed > WIND_ROLL_THRESHOLD) {
      const windFactor = Math.min(1, (windSpeed - WIND_ROLL_THRESHOLD) / 2);
      finalTargetRoll += Math.sign(sinA) * WIND_ROLL_EXTRA * windFactor;
    }

    // ── Angular spring (DT-integrated) ──────────────────────────────────────
    smoothPitch.current += (targetPitch - smoothPitch.current) * ANGULAR_SMOOTH;
    smoothRoll.current += (finalTargetRoll - smoothRoll.current) * ANGULAR_SMOOTH;

    const speed = Math.hypot(velX.current, velZ.current);
    const gyroFactor = 1 / (1 + speed * GYRO);
    const effectiveStiffness = stiffness * gyroFactor;
    const angDamp = Math.exp(-waterDrag * DT);

    velPitch.current = velPitch.current * angDamp + (smoothPitch.current - pitch.current) * effectiveStiffness * DT;
    velRoll.current  = velRoll.current  * angDamp + (smoothRoll.current  - roll.current)  * effectiveStiffness * DT;
    pitch.current += velPitch.current * DT;
    roll.current  += velRoll.current  * DT;

    // ── Vertical physics (SI units) ──────────────────────────────────────────
    velY.current -= G * DT;

    const submersion = targetY - posY.current;
    if (submersion > 0) {
      const buoyAcc = (RHO_WATER * G * width * length * submersion) / mass;
      velY.current += buoyAcc * DT;
    }
    velY.current *= Math.exp(-waterDrag * DT);
    posY.current += velY.current * DT;

    // ── Horizontal physics (SI units) ────────────────────────────────────────
    const hDamp = Math.exp(-HD * DT);
    velX.current *= hDamp;
    velZ.current *= hDamp;

    // Wave-slope drift
    velX.current += (-Math.sin(pitch.current) * cosH - Math.sin(roll.current) * sinH) * DRIFT_FORCE * DT;
    velZ.current += ( Math.sin(pitch.current) * sinH - Math.sin(roll.current) * cosH) * DRIFT_FORCE * DT;

    // Wind/sail thrust — terminal velocity = maxSpeed × windNorm × angularEff × sailFactor
    const angularEff = 0.75 + 0.25 * Math.cos((windAngleRef?.current ?? 0) - headingRef.current);
    const sailFactor = sailLevelRef.current / 3;
    const windNorm = Math.min((windSpeedRef?.current ?? 0) / BASE_WIND_SPEED, 2.0);
    const thrustAcc = HD * maxSpeed * windNorm * angularEff * sailFactor;
    velX.current += thrustAcc * DT * cosH;
    velZ.current += thrustAcc * DT * -sinH;

    posX.current += velX.current * DT;
    posZ.current += velZ.current * DT;

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
            <meshBasicMaterial color={0x00ff00} wireframe />
          </mesh>
        </group>
      </group>
      {arrows.map((a, i) => <primitive key={i} object={a} />)}
    </>
  );
}
