// useDepthRenderTarget.ts
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export function useDepthRenderTarget() {
    return useMemo(() => {
        const depthTexture = new THREE.DepthTexture(0, 0);
        depthTexture.type = THREE.UnsignedShortType;

        return new THREE.WebGLRenderTarget(0, 0, {
            depthTexture,
            depthBuffer: true,
        });
    }, []);
}