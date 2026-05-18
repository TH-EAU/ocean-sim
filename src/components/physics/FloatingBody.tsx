// import { useMemo, useRef } from "react";
// import { useFrame } from "@react-three/fiber";
// import * as THREE from "three";
// import type { BoatTransform } from "@customTypes/boat";
// import { useOcean } from "@/src/contexts/OceanContext";
// import { buildDerivedWaves, sampleOceanYRaw } from "@ocean/oceanUtils/gerstner";

// const DT = 1 / 60;
// const G = 9.81;
// const RHO_WATER = 1025;

// const UP = new THREE.Vector3(0, 1, 0);
// const COLOR_SUBMERGED = new THREE.Color(0x4488ff);
// const COLOR_ABOVE = new THREE.Color(0xffff00);
// const FLOTATION_SEGS = [[0, 1], [1, 3], [3, 2], [2, 0]] as const;

// const CORNERS: [1 | -1, 1 | -1][] = [
//   [1, -1],
//   [1, 1],
//   [-1, -1],
//   [-1, 1],
// ];

// interface FloatingBodyProps {
//   children?: React.ReactNode;
//   width?: number;
//   length?: number;
//   draft?: number;
//   mass?: number;
//   waterDrag?: number;    // amortissement linéaire vertical (s⁻¹)
//   angularDamp?: number;  // amortissement angulaire (s⁻¹), défaut = waterDrag
//   stiffness?: number;    // raideur angulaire (rad/s²)
//   modelYaw?: number;
//   posXRef: React.RefObject<number>;
//   posZRef: React.RefObject<number>;
//   headingRef: React.RefObject<number>;
//   transformRef?: React.RefObject<BoatTransform>;
// }

// export default function FloatingBody({
//   children,
//   width = 4,
//   length = 10,
//   draft = 0.5,
//   mass = 5000,
//   waterDrag = 1.2,
//   angularDamp,
//   stiffness = 0.08,
//   modelYaw = 0,
//   posXRef,
//   posZRef,
//   headingRef,
//   transformRef,
// }: FloatingBodyProps) {
//   const posRef = useRef<THREE.Group>(null);
//   const tiltRef = useRef<THREE.Group>(null);
//   const { disturbtion, currentDirection, waveLayers } = useOcean(); // ça c'est bien

//   const posY = useRef(0);
//   const velY = useRef(0);
//   const pitch = useRef(0);
//   const roll = useRef(0);
//   const velPitch = useRef(0);
//   const velRoll = useRef(0);

//   const arrows = useMemo(
//     () => CORNERS.map(() => new THREE.ArrowHelper(UP, new THREE.Vector3(), 1, COLOR_ABOVE)),
//     [],
//   );

//   const { flotPositions, flotGeometry } = useMemo(() => {
//     const flotPositions = new Float32Array(24); // 4 segments × 2 pts × 3 coords
//     const flotGeometry = new THREE.BufferGeometry();
//     flotGeometry.setAttribute("position", new THREE.BufferAttribute(flotPositions, 3));
//     return { flotPositions, flotGeometry };
//   }, []);

//   const _euler = useMemo(() => new THREE.Euler(), []);

//   useFrame(({ clock }) => {
//     const t = clock.elapsedTime;
//     const cx = posXRef.current;
//     const cz = posZRef.current;
//     const cosH = Math.cos(headingRef.current);
//     const sinH = Math.sin(headingRef.current);

//     const bowX = cosH * length / 2;
//     const bowZ = -sinH * length / 2;
//     const stbdX = sinH * width / 2;
//     const stbdZ = cosH * width / 2;

//     const derived = buildDerivedWaves(currentDirection, disturbtion, waveLayers);
//     const sample = (x: number, z: number) => sampleOceanYRaw(x, z, derived, t);

//     const hBP = sample(cx + bowX - stbdX, cz + bowZ - stbdZ);
//     const hBS = sample(cx + bowX + stbdX, cz + bowZ + stbdZ);
//     const hSP = sample(cx - bowX - stbdX, cz - bowZ - stbdZ);
//     const hSS = sample(cx - bowX + stbdX, cz - bowZ + stbdZ);
//     const heights = [hBP, hBS, hSP, hSS];

//     const frontAvg = (hBP + hBS) / 2;
//     const backAvg = (hSP + hSS) / 2;
//     const portAvg = (hBP + hSP) / 2;
//     const stbdAvg = (hBS + hSS) / 2;
//     const mean = (hBP + hBS + hSP + hSS) / 4;

//     const targetY = mean - draft;

//     // Hull plane normal from the 4 corner 3D positions
//     const fwdX = 2 * bowX, fwdY = frontAvg - backAvg, fwdZ = 2 * bowZ;
//     const rgtX = 2 * stbdX, rgtY = stbdAvg - portAvg, rgtZ = 2 * stbdZ;
//     const nx = rgtY * fwdZ - rgtZ * fwdY;
//     const ny = rgtZ * fwdX - rgtX * fwdZ;
//     const nz = rgtX * fwdY - rgtY * fwdX;
//     const nFwd = nx * cosH + nz * (-sinH);
//     const nRght = nx * sinH + nz * cosH;
//     const targetPitch = Math.atan2(-nFwd, ny);
//     const targetRoll = Math.atan2(nRght, ny);

//     // ── Angular spring (direct — no pre-filter) ──────────────────────────────
//     const angDamp = Math.exp(-(angularDamp ?? waterDrag) * DT);
//     velPitch.current = velPitch.current * angDamp + (targetPitch - pitch.current) * stiffness * DT;
//     velRoll.current = velRoll.current * angDamp + (targetRoll - roll.current) * stiffness * DT;
//     pitch.current += velPitch.current * DT;
//     roll.current += velRoll.current * DT;

//     // ── Vertical physics (gravity + Archimedes) ───────────────────────────────
//     velY.current -= G * DT;
//     const submersion = targetY - posY.current;
//     if (submersion > 0) {
//       velY.current += (RHO_WATER * G * width * length * submersion / mass) * DT;
//     }
//     velY.current *= Math.exp(-waterDrag * DT);
//     posY.current += velY.current * DT;

//     // ── Apply to Three.js groups ──────────────────────────────────────────────
//     if (posRef.current) {
//       posRef.current.position.set(cx, posY.current, cz);
//       _euler.set(0, headingRef.current, 0);
//       posRef.current.quaternion.setFromEuler(_euler);
//     }
//     if (tiltRef.current) {
//       tiltRef.current.rotation.set(roll.current, 0, pitch.current);
//     }

//     if (transformRef) {
//       transformRef.current = {
//         x: cx,
//         y: posY.current,
//         z: cz,
//         heading: headingRef.current,
//         pitch: pitch.current,
//         roll: roll.current,
//       };
//     }

//     // ── Debug arrows + flotation wireframe ────────────────────────────────────
//     const cornerPos: [number, number, number][] = [];
//     CORNERS.forEach(([ls, ws], i) => {
//       const wx = cx + ls * bowX + ws * stbdX;
//       const wz = cz + ls * bowZ + ws * stbdZ;
//       const submersion_i = heights[i] - (posY.current - draft);
//       arrows[i].position.set(wx, heights[i], wz);
//       arrows[i].setLength(Math.max(0.2, Math.abs(submersion_i) * 3));
//       arrows[i].setColor(submersion_i > 0 ? COLOR_SUBMERGED : COLOR_ABOVE);
//       cornerPos.push([wx, heights[i], wz]);
//     });
//     FLOTATION_SEGS.forEach(([a, b], si) => {
//       flotPositions[si * 6 + 0] = cornerPos[a][0]; flotPositions[si * 6 + 1] = cornerPos[a][1]; flotPositions[si * 6 + 2] = cornerPos[a][2];
//       flotPositions[si * 6 + 3] = cornerPos[b][0]; flotPositions[si * 6 + 4] = cornerPos[b][1]; flotPositions[si * 6 + 5] = cornerPos[b][2];
//     });
//     flotGeometry.attributes.position.needsUpdate = true;
//   });

//   return (
//     <>
//       <group ref={posRef}>
//         <group ref={tiltRef}>
//           <group rotation={[0, modelYaw, 0]}>{children}</group>
//           <mesh>
//             <boxGeometry args={[length, 2, width]} />
//             <meshBasicMaterial color={0x00ff00} wireframe />
//           </mesh>
//         </group>
//       </group>
//       {arrows.map((a, i) => <primitive key={i} object={a} />)}
//       <lineSegments geometry={flotGeometry} frustumCulled={false}>
//         <lineBasicMaterial color={0x88ffff} />
//       </lineSegments>
//     </>
//   );
// }
