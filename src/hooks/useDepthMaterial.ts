import { useMemo } from 'react';
import * as THREE from 'three';

interface UseDepthMaterialOptions {
    uniforms: Record<string, THREE.IUniform>;
    chunkId: string;
    applyVertexChunk: (
        shader: THREE.WebGLProgramParametersWithUniforms,
        uniforms: Record<string, THREE.IUniform>,
        flag: boolean,
        downgrade: boolean
    ) => void;
}

export function useDepthMaterial({
    uniforms,
    chunkId,
    applyVertexChunk,
}: UseDepthMaterialOptions) {
    return useMemo(() => {

        const mat = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
        });

        mat.onBeforeCompile = (shader) => {
            applyVertexChunk(shader, uniforms, false, false);
        };

        mat.customProgramCacheKey = () => `ocean-chunk-depth-${chunkId}`;

        return mat;
    }, [uniforms, chunkId, applyVertexChunk]);
}