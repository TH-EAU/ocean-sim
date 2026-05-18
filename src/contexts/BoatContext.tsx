import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { BoatTransform } from "../types/boat";

const MAX_SAIL_LEVEL = 3;

export interface WindDisplay {
  speed: number;
  angle: number;
}

export interface BoatContextValue {
  sailLevelRef: React.RefObject<number>;
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
  const sailLevelRef = useRef<number>(0);
  const steeringRef = useRef<number>(0);
  const transformRef = useRef<BoatTransform>({ x: 0, y: 0, z: 0, heading: 0 });

  const [throttleLevel, setThrottleLevel] = useState(0);
  const [cameraMode, setCameraMode] = useState<"follow" | "orbit">("follow");
  const [windDisplay, setWindDisplay] = useState<WindDisplay>({ speed: 0, angle: 0 });

  const throttleRef = useRef(0);
  throttleRef.current = throttleLevel;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "z": {
          const next = Math.min(MAX_SAIL_LEVEL, throttleRef.current + 1);
          setThrottleLevel(next);
          sailLevelRef.current = next;
          break;
        }
        case "s": {
          const next = Math.max(0, throttleRef.current - 1);
          setThrottleLevel(next);
          sailLevelRef.current = next;
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
  }, []);

  // Refresh HUD wind display at 10 fps
  useEffect(() => {
    const id = setInterval(() => {
      setWindDisplay({ speed: windSpeedRef.current ?? 0, angle: windAngleRef.current ?? 0 });
    }, 100);
    return () => clearInterval(id);
  }, [windAngleRef, windSpeedRef]);

  const value: BoatContextValue = {
    sailLevelRef,
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
