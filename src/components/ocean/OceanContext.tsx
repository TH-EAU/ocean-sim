import { createContext, useContext } from "react";
import type { WaveLayer } from "../../types/wave";
import { DEFAULT_WAVE_LAYERS } from "./oceanConsts";

export interface OceanState {
    currentSpeed:     number;
    currentDirection: [number, number];
    disturbtion:      number;
    windSpeed:        number;
    waveLayers:       WaveLayer[];
}

const defaultState: OceanState = {
    currentSpeed:     0,
    currentDirection: [0, 1],
    disturbtion:      0.3,
    windSpeed:        5,
    waveLayers:       DEFAULT_WAVE_LAYERS,
};

export const OceanContext = createContext<OceanState>(defaultState);

export const useOcean = () => useContext(OceanContext);
