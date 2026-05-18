// useShaderInjection.ts
import { useCallback } from 'react';
import * as THREE from 'three';

interface UseShaderInjectionOptions {
    uniforms: Record<string, THREE.IUniform>;
    downgradeQuality: boolean;
    applyVertexChunk: (
        shader: THREE.WebGLProgramParametersWithUniforms,
        uniforms: Record<string, THREE.IUniform>,
        flag: boolean,
        downgrade: boolean
    ) => void;
    applyFragmentChunk: (
        shader: THREE.WebGLProgramParametersWithUniforms,
        downgrade: boolean,
    ) => void;
}

export function useShaderInjection({
    uniforms,
    downgradeQuality,
    applyVertexChunk,
    applyFragmentChunk,
}: UseShaderInjectionOptions) {
    return useCallback(
        (shader: THREE.WebGLProgramParametersWithUniforms) => {
            applyVertexChunk(shader, uniforms, true, downgradeQuality);
            applyFragmentChunk(shader, downgradeQuality);
        },
        [uniforms, downgradeQuality, applyVertexChunk, applyFragmentChunk],
    );
}