// Ici on va gérer la direction du vent et tout le bordel lié a ça, on peut imaginer une carte des vents comme références, pour déterminer des courants de vents réguliers comme des alizées

// WindContext.tsx
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';

interface WindConfig {
    baseAngle: number;       // radians
    windSpeed: number;
    angleVariance?: number;  // amplitude de dérive angulaire, défaut 0.3
    speedVariance?: number;  // % de variation de vitesse, défaut 0.2
}

interface WindContextValue {
    windAngleRef: React.RefObject<number>;
    windSpeedRef: React.RefObject<number>;
}

const WindContext = createContext<WindContextValue | null>(null);

// ——— Provider ———————————————————————————————————————————

interface WindProviderProps extends WindConfig {
    children: ReactNode;
}

export function WindProvider({
    children,
    baseAngle,
    windSpeed,
    angleVariance = 0.3,
    speedVariance = 0.2,
}: WindProviderProps) {
    const windAngleRef = useRef<number>(baseAngle);
    const windSpeedRef = useRef<number>(windSpeed);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        windAngleRef.current = baseAngle + angleVariance * Math.sin(t * 0.07);
        windSpeedRef.current = windSpeed * (1 - speedVariance + speedVariance * Math.sin(t * 0.05));
    });

    return (
        <WindContext.Provider value={{ windAngleRef, windSpeedRef }}>
            {children}
        </WindContext.Provider>
    );
}

// ——— Hook ————————————————————————————————————————————————

export function useWind(): WindContextValue {
    const ctx = useContext(WindContext);
    if (!ctx) throw new Error('useWind must be used within a WindProvider');
    return ctx;
}