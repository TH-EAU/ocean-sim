import fragment from "../utils/water.frag.glsl?raw"
import vertex from "../utils/water.vert.glsl?raw"
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useDepthRenderTarget } from "../hooks/useDepthRenderTarget"
import normalMapUrl from "../assets/Water 0341normal.jpg?url";
import { useTexture } from "@react-three/drei"


const Test = () => {
    const { gl, scene, camera, size: canvasSize } = useThree() // size.width / size.height
    const matRef = useRef(null)
    const depthRT = useDepthRenderTarget()

    const normalMap = useTexture(normalMapUrl, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true;
    });

    const refractionTarget = useMemo(
        () =>
            new THREE.WebGLRenderTarget(canvasSize.width / 2, canvasSize.height / 2, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                depthBuffer: true,
                depthTexture: new THREE.DepthTexture(
                    canvasSize.width / 2,
                    canvasSize.height / 2
                ),
            }),
        [canvasSize.width, canvasSize.height]
    );

    // ── Texture de caustiques procédurale ─────────────────────
    const causticsTex = useMemo(() => {
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            const x = (i % size) / size;
            const y = Math.floor(i / size) / size;
            // Voronoï simplifié pour les caustiques
            let minDist = 1.0;
            for (let j = 0; j < 8; j++) {
                const cx = (Math.sin(j * 2.399) * 0.5 + 0.5);
                const cy = (Math.cos(j * 3.141) * 0.5 + 0.5);
                const dx = x - cx;
                const dy = y - cy;
                minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
            }
            const v = Math.floor(Math.pow(1.0 - minDist * 2.0, 3.0) * 255);
            const bright = Math.max(0, v);
            data[i * 4 + 0] = bright;
            data[i * 4 + 1] = bright;
            data[i * 4 + 2] = bright;
            data[i * 4 + 3] = 255;
        }
        const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        return tex;
    }, []);

    useFrame(({ camera, size }) => {
        if (depthRT.width !== size.width || depthRT.height !== size.height) {
            depthRT.setSize(size.width, size.height);
        }

        gl.setRenderTarget(depthRT);
        gl.clear();
        gl.render(scene, camera);
        gl.setRenderTarget(null);
    }, -1);



    return (

        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100, 256, 256]} />
            <shaderMaterial
                ref={matRef}
                uniforms={{
                    uTime: { value: 0 },
                    // Fragment
                    uResolution: {
                        value: gl.getDrawingBufferSize(new THREE.Vector2()),

                    },
                    uProjectionMatrixInverse: { value: camera.projectionMatrixInverse },
                    uViewMatrixInverse: { value: camera.matrixWorld },
                    uDepthTexture: { value: depthRT.depthTexture },

                    uWaterColor: { value: new THREE.Color(0.04, 0.27, 0.35) },
                    uWaterClarity: { value: 0.6 },
                    uExtinctionColor: { value: new THREE.Color(0.45, 0.15, 0.06) },
                    uFresnelBias: { value: 0.02 },   // R0 physique ≈ 0.02 pour eau
                    uFresnelScale: { value: 0.98 },
                    uFresnelPower: { value: 5.0 },

                    uNear: { value: 0.1 },
                    uFar: { value: 100.0 },
                    uNormalMap: { value: normalMap },
                    uCausticsTex: { value: causticsTex },
                    uRefractionTex: { value: refractionTarget.texture },
                }}
                fragmentShader={fragment}
                vertexShader={vertex}
                transparent

                depthWrite
            />
        </mesh>
    )
}

export default Test;
