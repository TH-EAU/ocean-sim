import * as THREE from "three"

import fragment from "../shaders/fragment/ocean.frag.chunk.glsl?raw"
import fragUniforms from "../shaders/fragment/oceanUniforms.frag.chunk.glsl?raw"
import fragHelpers from "../shaders/fragment/oceanHelpers.frag.chunk.glsl?raw"

import vertex from "../shaders/vertex/ocean.vert.chunk.glsl?raw"
import vertUniform from "../shaders/vertex/oceanUniforms.vert.chunk.glsl?raw"
import vertHelpers from "../shaders/vertex/oceanHelpers.vert.chunk.glsl?raw"

import { MAX_WAVES } from "../oceanConsts";


export const applyVertexChunk = (shader: THREE.WebGLProgramParametersWithUniforms, customUniforms: object) => {
    Object.assign(shader.uniforms, customUniforms);
    shader.vertexShader = (
        `#define OCEAN_USE_NORMALS\n#define MAX_WAVES ${MAX_WAVES}\n` + shader.vertexShader
    )
        .replace(
            `#include <common>`,
            `#include <common>\n${vertUniform}\n${vertHelpers}`,
        )
        .replace(`#include <begin_vertex>`, vertex);
}

export const applyFragmentChunk = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader
        .replace(
            `#include <common>`,
            `#include <common>${fragUniforms}\n${fragHelpers}`,
        )
        .replace(
            `#include <map_fragment>`,
            `#include <map_fragment>\n${fragment}`,
        );
}

export const handleDepthMaterial = () => {
    const mat = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
    });
    mat.onBeforeCompile = applyVertexChunk; // ici j'ai retiré Object.assign(shader.uniforms, customUniforms); si les ombres portées des vagues ne marchent plus il faut le remettre
    mat.customProgramCacheKey = () => `ocean-depth-${MAX_WAVES}`;
    return mat;
}