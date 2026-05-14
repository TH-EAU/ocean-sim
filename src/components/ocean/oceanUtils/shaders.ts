import * as THREE from "three"

import fragment from "../shaders/fragment/ocean.frag.chunk.glsl?raw"
import fragUniforms from "../shaders/fragment/oceanUniforms.frag.chunk.glsl?raw"
import fragHelpers from "../shaders/fragment/oceanHelpers.frag.chunk.glsl?raw"

import vertex from "../shaders/vertex/ocean.vert.chunk.glsl?raw"
import vertUniform from "../shaders/vertex/oceanUniforms.vert.chunk.glsl?raw"
import vertHelpers from "../shaders/vertex/oceanHelpers.vert.chunk.glsl?raw"

import { MAX_WAVES } from "../oceanConsts";


export const applyVertexChunk = (shader: THREE.WebGLProgramParametersWithUniforms, uniforms: object, useNormals = true) => {
    Object.assign(shader.uniforms, uniforms);
    const defines = `#define MAX_WAVES ${MAX_WAVES}\n` + (useNormals ? `#define OCEAN_USE_NORMALS\n` : ``);
    shader.vertexShader = (defines + shader.vertexShader)
        .replace(
            `#include <common>`,
            `#include <common>\n${vertUniform}\n${vertHelpers}`,
        )
        .replace(`#include <begin_vertex>`, `#include <begin_vertex>\n${vertex}`);
}





export const applyFragmentChunk = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader
        .replace(
            `#include <common>`,
            `#include <common>\n${fragUniforms}\n${fragHelpers}`,
        )
        .replace(
            `#include <map_fragment>`,
            `#include <map_fragment>\n${fragment}`,
        );
}


export const handleDepthMaterial = (uniforms: Record<string, THREE.IUniform>) => {
    const mat = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
    });
    mat.onBeforeCompile = (shader) => {
        applyVertexChunk(shader, uniforms, false);
    };
    mat.customProgramCacheKey = () => `ocean-depth-${MAX_WAVES}`;
    return mat;
}