import { createContext, useContext } from "react";

export interface OceanState {
  currentSpeed: number;
  currentDirection: [number, number];
}

const defaultState: OceanState = {
  currentSpeed: 0,
  currentDirection: [0, 1],
};

export const OceanContext = createContext<OceanState>(defaultState);

export const useOcean = () => useContext(OceanContext);
