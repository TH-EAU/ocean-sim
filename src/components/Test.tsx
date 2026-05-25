import fragment from "../utils/water.frag.glsl?raw"
import vertex from "../utils/water.vert.glsl?raw"
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useDepthRenderTarget } from "../hooks/useDepthRenderTarget"
import normalMapUrl from "../assets/Water 0341normal.jpg?url";
import { useDepthBuffer, useTexture } from "@react-three/drei"
import heightmapUrl from "@assets/heightmap.jpg?url";
import { useFBO } from '@react-three/drei'

const Test = () => {
    const { gl, scene, camera, size: canvasSize } = useThree() // size.width / size.height
    const matRef = useRef<THREE.ShaderMaterial>(null)
    const meshRef = useRef<THREE.Mesh>(null);
    const depthRT = useDepthRenderTarget(canvasSize.width, canvasSize.height)

    const normalMap = useTexture(normalMapUrl, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true;
    });



    const refractionTarget = useDepthRenderTarget(canvasSize.width, canvasSize.height)

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


    const heightmap = useTexture(heightmapUrl, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
    });

    const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
        uTime: { value: 0 },
        // Fragment
        uResolution: {
            value: gl.getDrawingBufferSize(new THREE.Vector2()),

        },
        uProjectionMatrixInverse: { value: camera.projectionMatrixInverse },
        uViewMatrixInverse: { value: camera.matrixWorld },
        uDepthTexture: { value: refractionTarget.depthTexture },

        uWaterColor: { value: new THREE.Color(0.361, 0.867, 0.690) },
        uWaterClarity: { value: 0.6 },
        uExtinctionColor: { value: new THREE.Color(0.000, 0.243, 0.486) },
        uFresnelBias: { value: 0.02 },   // R0 physique ≈ 0.02 pour eau
        uFresnelScale: { value: 0.98 },
        uFresnelPower: { value: 5.0 },

        uNear: { value: 0.1 },
        uFar: { value: 100.0 },
        uNormalMap: { value: normalMap },
        uCausticsTex: { value: causticsTex },
        uRefractionTex: { value: refractionTarget.texture },
        depthSampler: { value: heightmap },
        uWaterDepth: { value: 10.0 },  // profondeur réelle du terrain en unités monde
        uWaterScale: { value: 1.0 },  // échelle de normalisation — tweakable indépendamment
        uPixelRatio: { value: window.devicePixelRatio },
        uTerrainOffset: { value: new THREE.Vector2(-300, -300) }, // la moitié de ta taille
        uTerrainSize: { value: new THREE.Vector2(600, 600) }, // taille de ton plane terrain

        uMaxThickness: { value: 3.0 },
        uHeightScale: { value: 10 },

        uExtinctionCoeff: { value: new THREE.Vector3(1.0, 0.5, 0.1) },
        uWaterDensity: { value: 0.1 },
        uDepthDensityScale: { value: .2 }

    }), [heightmap]);

    useFrame(({ camera, size, clock }) => {
        if (!matRef.current) return;
        matRef.current.uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uResolution.value.set(size.width, size.height);
        uniforms.uNear.value = (camera as THREE.PerspectiveCamera).near;
        uniforms.uFar.value = (camera as THREE.PerspectiveCamera).far;
        uniforms.uProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
        uniforms.uViewMatrixInverse.value.copy(camera.matrixWorld);

        // Render réfraction — scène sans la surface d'eau
        if (meshRef.current) meshRef.current.visible = false;
        gl.setRenderTarget(refractionTarget);
        gl.clear();
        gl.render(scene, camera);
        gl.setRenderTarget(null);
        if (meshRef.current) meshRef.current.visible = true;
    }, -1);



    return (

        <mesh rotation={[-Math.PI / 2, 0, 0]} ref={meshRef}>
            <planeGeometry args={[600, 600, 256, 256]} />
            <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
                fragmentShader={fragment}
                vertexShader={vertex}
                transparent

                depthWrite
            />
        </mesh>
    )
}

export default Test;
