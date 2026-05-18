import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useBoat } from "@contexts/BoatContext";

const MOUSE_SENSITIVITY = 0.003;
const PITCH_LIMIT = 10 * Math.PI / 180; // ±10°
const RETURN_FACTOR = 0.92;               // decay per frame after 3s inactivity

interface BoatCameraProps {
  orbitControlsRef: React.RefObject<any>;
  distance?: number;
  height?: number;
  lookAhead?: number;
  smoothing?: number;
}

export default function BoatCamera({
  orbitControlsRef,
  distance = 5,
  height = 5,
  lookAhead = 1,
  smoothing = 0.08,
}: BoatCameraProps) {
  const { transformRef, cameraMode } = useBoat();

  // Reusable objects — allocated once
  const _euler = useMemo(() => new THREE.Euler(), []);
  const _qHead = useMemo(() => new THREE.Quaternion(), []);
  const _qBody = useMemo(() => new THREE.Quaternion(), []);
  const _qTotal = useMemo(() => new THREE.Quaternion(), []);
  const _camTarget = useMemo(() => new THREE.Vector3(), []);
  const _lookAtTarget = useMemo(() => new THREE.Vector3(), []);
  const _localVec = useMemo(() => new THREE.Vector3(), []);
  const _worldUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _lookDir = useMemo(() => new THREE.Vector3(), []);
  const _rightAxis = useMemo(() => new THREE.Vector3(), []);
  const _qMouseYaw = useMemo(() => new THREE.Quaternion(), []);
  const _qMousePitch = useMemo(() => new THREE.Quaternion(), []);
  const _lookTarget = useMemo(() => new THREE.Vector3(), []);

  // Mouse look state
  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0);
  const lastMouseMs = useRef(Date.now());
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (cameraModeRef.current !== "follow") return;
      cameraYawRef.current -= e.movementX * MOUSE_SENSITIVITY;
      cameraPitchRef.current = THREE.MathUtils.clamp(
        cameraPitchRef.current - e.movementY * MOUSE_SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
      lastMouseMs.current = Date.now();
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useFrame(({ camera }) => {
    const t = transformRef.current;
    if (!t) return;

    // Always keep orbit target centered on the boat (works in both modes)
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.set(t.x, t.y, t.z);
      orbitControlsRef.current.enabled = (cameraMode === "orbit");
    }

    if (cameraMode !== "follow") return;

    // Reconstruct full boat quaternion — same composition as FloatingBody
    _euler.set(0, t.heading, 0);
    _qHead.setFromEuler(_euler);
    _euler.set(-t.roll, 0, t.pitch);
    _qBody.setFromEuler(_euler);
    _qTotal.copy(_qHead).multiply(_qBody);

    // Camera position — behind bow (-X local), above (+Y local)
    _localVec.set(-distance, height, 0);
    _camTarget
      .copy(_localVec)
      .applyQuaternion(_qTotal)
      .add(new THREE.Vector3(t.x, t.y, t.z));

    // Default look-at: slightly in front of bow (+X local)
    _localVec.set(lookAhead, 0, 0);
    _lookAtTarget
      .copy(_localVec)
      .applyQuaternion(_qTotal)
      .add(new THREE.Vector3(t.x, t.y, t.z));

    camera.position.lerp(_camTarget, smoothing);

    // Auto-return mouse offsets after 3s inactivity
    if (Date.now() - lastMouseMs.current > 3000) {
      cameraYawRef.current *= RETURN_FACTOR;
      cameraPitchRef.current *= RETURN_FACTOR;
    }

    // Rotate look direction by mouse yaw then pitch
    _lookDir.copy(_lookAtTarget).sub(camera.position).normalize();

    _qMouseYaw.setFromAxisAngle(_worldUp, cameraYawRef.current);
    _lookDir.applyQuaternion(_qMouseYaw);

    _rightAxis.crossVectors(_lookDir, _worldUp).normalize();
    _qMousePitch.setFromAxisAngle(_rightAxis, cameraPitchRef.current);
    _lookDir.applyQuaternion(_qMousePitch);

    _lookTarget
      .copy(camera.position)
      .addScaledVector(_lookDir, distance + lookAhead + 1);
    camera.lookAt(_lookTarget);
  });

  return null;
}
