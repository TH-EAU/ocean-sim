import type { RefObject } from "react";
import * as THREE from "three"

export default interface oceanChunk {
    id: string;
    depthRT: THREE.WebGLRenderTarget;
    gridOffset: [number, number];
    tileSize: number;
    resolution: number;
    /** Shared ref to camera XZ position — read each frame without triggering re-renders */
    cameraOffsetRef?: RefObject<THREE.Vector2>;
    renderOrder?: number;
    downgradeQuality?: boolean;
}