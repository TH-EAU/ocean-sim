import * as THREE from "three"

import fragment from "@ocean/shaders/fragment/ocean.frag.chunk.glsl?raw"
import lowFragment from "@ocean/shaders/fragment/lowOcean.frag.chunk.glsl?raw"
import fragUniforms from "@ocean/shaders/fragment/oceanUniforms.frag.chunk.glsl?raw"
import fragHelpers from "@ocean/shaders/fragment/oceanHelpers.frag.chunk.glsl?raw"

import vertex from "@ocean/shaders/vertex/ocean.vert.chunk.glsl?raw"
import lowVertex from "@ocean/shaders/vertex/lowOcean.vert.chunk.glsl?raw"
import vertUniform from "@ocean/shaders/vertex/oceanUniforms.vert.chunk.glsl?raw"
import vertHelpers from "@ocean/shaders/vertex/oceanHelpers.vert.chunk.glsl?raw"

import { MAX_WAVES } from "@ocean/oceanConsts";


export const applyVertexChunk = (shader: THREE.WebGLProgramParametersWithUniforms, uniforms: object, useNormals: boolean, downgradeQuality: boolean) => {
    Object.assign(shader.uniforms, uniforms);
    const defines = `#define MAX_WAVES ${MAX_WAVES}\n` + (useNormals ? `#define OCEAN_USE_NORMALS\n` : ``);
    shader.vertexShader = (defines + shader.vertexShader)
        .replace(
            `#include <common>`,
            `#include <common>\n${vertUniform}\n${vertHelpers}`,
        )
        .replace(`#include <begin_vertex>`, `#include <begin_vertex>\n${downgradeQuality ? lowVertex : vertex}`);
}





export const applyFragmentChunk = (shader: THREE.WebGLProgramParametersWithUniforms, downgradeQuality: boolean) => {
    shader.fragmentShader = shader.fragmentShader
        .replace(
            `#include <common>`,
            `#include <common>\n${fragUniforms}\n${fragHelpers}`,
        )
        .replace(
            `#include <map_fragment>`,
            `#include <map_fragment>\n${downgradeQuality ? lowFragment : fragment}`,
        );
}


export const handleDepthMaterial = (uniforms: Record<string, THREE.IUniform>, chunkId: string) => {
    const mat = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
    });
    mat.onBeforeCompile = (shader) => {
        applyVertexChunk(shader, uniforms, false, true);
    };
    mat.customProgramCacheKey = () => `ocean-chunk-depth-${chunkId}`;
    return mat;
}