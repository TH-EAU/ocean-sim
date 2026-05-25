// useDepthRenderTarget.ts
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export function useDepthRenderTarget(width: number, height: number) {
    const rt = useMemo(() => {
        const depthTexture = new THREE.DepthTexture(width, height);
        depthTexture.type = THREE.UnsignedShortType;

        return new THREE.WebGLRenderTarget(width, height, {
            depthTexture,
            depthBuffer: true,
        });
    }, [width, height]); // se recrée si la taille change

    return rt;
}