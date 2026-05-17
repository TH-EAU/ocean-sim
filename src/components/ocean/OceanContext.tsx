import { createContext, useContext } from "react";

export interface OceanState {
  currentSpeed:     number;
  currentDirection: [number, number];
  disturbtion:      number;
  windSpeed:        number;
}

const defaultState: OceanState = {
  currentSpeed:     0,
  currentDirection: [0, 1],
  disturbtion:      0.3,
  windSpeed:        5,
};

export const OceanContext = createContext<OceanState>(defaultState);

export const useOcean = () => useContext(OceanContext);
