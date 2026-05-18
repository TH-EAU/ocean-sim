// OceanContext.tsx
import { createContext, useContext, useState } from 'react';
import { WAVE_LAYERS } from '@ocean/oceanConsts';
import type { GerstnerWave } from '../types/waveConfig';

interface OceanState {
    currentDirection: [number, number];
    disturbance: number;
    windSpeed: number;
    waveLayers: GerstnerWave[];
}

type OceanContextValue = OceanState & {
    setWindSpeed: (speed: number) => void;
    setCurrentDirection: (dir: [number, number]) => void;
    setDisturbance: (value: number) => void;
    setWaveLayer: (index: number, patch: Partial<GerstnerWave>) => void;
    setWaveLayers: (layers: GerstnerWave[]) => void;
};

const defaultState: OceanState = {
    currentDirection: [0, 1],
    disturbance: .5,
    windSpeed: 5,
    waveLayers: WAVE_LAYERS,
};

const OceanContext = createContext<OceanContextValue | null>(null);

export function OceanProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<OceanState>(defaultState);

    const setWindSpeed = (windSpeed: number) => setState(s => ({ ...s, windSpeed }));
    const setCurrentDirection = (currentDirection: [number, number]) => setState(s => ({ ...s, currentDirection }));
    const setDisturbance = (disturbance: number) => setState(s => ({ ...s, disturbance }));
    const setWaveLayers = (waveLayers: GerstnerWave[]) => setState(s => ({ ...s, waveLayers }));
    const setWaveLayer = (index: number, patch: Partial<GerstnerWave>) =>
        setState(s => {
            const waveLayers = [...s.waveLayers];
            waveLayers[index] = { ...waveLayers[index], ...patch };
            return { ...s, waveLayers };
        });
    return (
        <OceanContext.Provider value={{ ...state, setWindSpeed, setCurrentDirection, setDisturbance, setWaveLayers, setWaveLayer }}>
            {children}
        </OceanContext.Provider>
    );
}

export function useOcean(): OceanContextValue {
    const ctx = useContext(OceanContext);
    if (!ctx) throw new Error('useOcean must be used within an OceanProvider');
    return ctx;
}