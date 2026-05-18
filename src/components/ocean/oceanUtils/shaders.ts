import * as THREE from "three"

import fragment from "@ocean/shaders/fragment/ocean.frag.chunk.glsl?raw"
import lowFragment from "@ocean/shaders/fragment/lowOcean.frag.chunk.glsl?raw"
import fragUniforms from "@ocean/shaders/fragment/oceanUniforms.frag.chunk.glsl?raw"
import fragHelpers from "@ocean/shaders/fragment/oceanHelpers.frag.chunk.glsl?raw"

import vertex from "@ocean/shaders/vertex/ocean.vert.chunk.glsl?raw"
import lowVertex from "@ocean/shaders/vertex/lowOcean.vert.chunk.glsl?raw"
import vertUniform from "@ocean/shaders/vertex/oceanUniforms.vert.chunk.glsl?raw"
import vertHelpers from "@ocean/shaders/vertex/oceanHelpers.vert.chunk.glsl?raw"
import { MAX_WAVES } from "../oceanConsts"


export const applyVertexChunk = (shader: THREE.WebGLProgramParametersWithUniforms, uniforms: object, useNormals: boolean, downgradeQuality: boolean) => {
    Object.assign(shader.uniforms, uniforms);
    const defines = `#define MAX_WAVES ${MAX_WAVES}\n#define G 9.81\n` + (useNormals ? `#define OCEAN_USE_NORMALS\n` : ``);
    // ICI: MAW_WAVES c'est de la merde, mais c'est de ma faute cette fois. Comme j'ai tout mis dans des hooks, je n'arrive pas à récupérer mon waveCount de manière correct (sans faire du props drilling).
    // Le waveCount c'est pour éviter le break; dans la boucle GPU et lui donner un tableau statique, ce qui est mieux supporté par les GPU askip. Au moins pour éviter les boucles infinies j'imagine.
    // @TODO : L'idée est simple : il faut revoir mes hooks, c'est tout. 

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