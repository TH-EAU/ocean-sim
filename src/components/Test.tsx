import fragment from "../utils/water.frag.glsl?raw"
import vertex from "../utils/water.vert.glsl?raw"
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useDepthRenderTarget } from "../hooks/useDepthRenderTarget"
import { useTexture } from "@react-three/drei"
import normalMapUrl from "../assets/Water 0341normal.jpg?url"
import heightmapUrl from "@assets/heightmap.jpg?url"

const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.5)

const Water = () => {
    const { gl, scene, camera, size } = useThree()
    const matRef = useRef<THREE.ShaderMaterial>(null)
    const meshRef = useRef<THREE.Mesh>(null)

    const normalMap = useTexture(normalMapUrl, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.minFilter = THREE.LinearMipmapLinearFilter
    })

    const heightmap = useTexture(heightmapUrl, (tex) => {
        tex.minFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    })

    const dpr = gl.getPixelRatio()
    const refractionTarget = useDepthRenderTarget(size.width * dpr, size.height * dpr)

    const uniforms = useMemo<Record<string, THREE.IUniform>>(() => ({
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(size.width * dpr, size.height * dpr) },
        uProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uViewMatrixInverse: { value: new THREE.Matrix4() },

        uNormalMap: { value: normalMap },
        depthSampler: { value: heightmap },
        uRefractionTex: { value: refractionTarget.texture },
        uDepthTexture: { value: refractionTarget.depthTexture },

        uTerrainOffset: { value: new THREE.Vector2(-300, -300) },
        uTerrainSize: { value: new THREE.Vector2(600, 600) },
        uHeightScale: { value: 10 },

        uMaxThickness: { value: 3.0 },
        uExtinctionCoeff: { value: new THREE.Vector3(1.0, 0.5, 0.1) },
        uWaterDensity: { value: 0.1 },
        uDepthDensityScale: { value: 0.2 },

        uFresnelBias: { value: 0.02 },
        uFresnelScale: { value: 0.98 },
        uFresnelPower: { value: 5.0 },
    }), [heightmap, normalMap])

    useFrame(({ camera, size, clock }) => {
        const mat = matRef.current
        if (!mat) return

        const dpr = gl.getPixelRatio()

        mat.uniforms.uTime.value = clock.getElapsedTime()
        mat.uniforms.uResolution.value.set(size.width * dpr, size.height * dpr)
        mat.uniforms.uProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse)
        mat.uniforms.uViewMatrixInverse.value.copy(camera.matrixWorld)

        if (meshRef.current) meshRef.current.visible = false
        gl.clippingPlanes = [clipPlane]
        gl.localClippingEnabled = true
        gl.setRenderTarget(refractionTarget)
        gl.clear()
        gl.render(scene, camera)
        gl.setRenderTarget(null)
        gl.clippingPlanes = []
        gl.localClippingEnabled = false
        if (meshRef.current) meshRef.current.visible = true
    }, -1)

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
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

export default Water