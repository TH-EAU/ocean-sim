import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { BoatTransform } from "../types/boat";

const THRUST_SCALE = 0.0015;
const MAX_THROTTLE = 3;

export interface WindDisplay {
  speed: number;
  angle: number;
}

export interface BoatContextValue {
  thrustRef: React.RefObject<number>;
  steeringRef: React.RefObject<number>;
  windAngleRef: React.RefObject<number>;
  windSpeedRef: React.RefObject<number>;
  transformRef: React.RefObject<BoatTransform>;
  throttleLevel: number;
  cameraMode: "follow" | "orbit";
  windDisplay: WindDisplay;
}

const BoatContext = createContext<BoatContextValue | null>(null);

export function useBoat(): BoatContextValue {
  const ctx = useContext(BoatContext);
  if (!ctx) throw new Error("useBoat must be inside BoatProvider");
  return ctx;
}

interface BoatProviderProps {
  children: React.ReactNode;
  windAngleRef: React.RefObject<number>;
  windSpeedRef: React.RefObject<number>;
}

export function BoatProvider({ children, windAngleRef, windSpeedRef }: BoatProviderProps) {
  const thrustRef = useRef<number>(0);
  const steeringRef = useRef<number>(0);
  const transformRef = useRef<BoatTransform>({ x: 0, y: 0, z: 0, heading: 0 });

  const [throttleLevel, setThrottleLevel] = useState(0);
  const [cameraMode, setCameraMode] = useState<"follow" | "orbit">("follow");
  const [windDisplay, setWindDisplay] = useState<WindDisplay>({ speed: 0, angle: 0 });

  // Stable ref to current throttle level — avoids stale closures in event handlers
  const throttleRef = useRef(0);
  throttleRef.current = throttleLevel;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "z": {
          const next = Math.min(MAX_THROTTLE, throttleRef.current + 1);
          setThrottleLevel(next);
          thrustRef.current = (windSpeedRef.current ?? 5) * (next / MAX_THROTTLE) * THRUST_SCALE;
          break;
        }
        case "s": {
          const next = Math.max(0, throttleRef.current - 1);
          setThrottleLevel(next);
          thrustRef.current = (windSpeedRef.current ?? 5) * (next / MAX_THROTTLE) * THRUST_SCALE;
          break;
        }
        case "d": steeringRef.current = -1; break;
        case "q": steeringRef.current = 1; break;
        case "c": setCameraMode(m => m === "follow" ? "orbit" : "follow"); break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "d" && steeringRef.current < 0) steeringRef.current = 0;
      if (k === "q" && steeringRef.current > 0) steeringRef.current = 0;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [windSpeedRef]);

  // Update thrust dynamically as wind speed varies + refresh HUD at 10 fps
  useEffect(() => {
    const id = setInterval(() => {
      const spd = windSpeedRef.current ?? 0;
      thrustRef.current = spd * (throttleRef.current / MAX_THROTTLE) * THRUST_SCALE;
      setWindDisplay({ speed: spd, angle: windAngleRef.current ?? 0 });
    }, 200);
    return () => clearInterval(id);
  }, [windAngleRef, windSpeedRef]);

  const value: BoatContextValue = {
    thrustRef,
    steeringRef,
    windAngleRef,
    windSpeedRef,
    transformRef,
    throttleLevel,
    cameraMode,
    windDisplay,
  };

  return <BoatContext.Provider value={value}>{children}</BoatContext.Provider>;
}
