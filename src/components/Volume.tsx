import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
    ShaderMaterial, DepthTexture, WebGLRenderTarget,
    UnsignedShortType, Vector2, DoubleSide,
} from 'three'
import { ReactNode } from 'react'

import vertexShader from './vertexShader.glsl'
import fragmentShader from './fragmentShader.glsl'

// ── Types ────────────────────────────────────────────────
interface VolumeAbsorptionProps {
    absorptionColor?: [number, number, number]
    density?: number
    maxThickness?: number
    scatterColor?: [number, number, number]
    scatterStrength?: number
    children?: ReactNode   // géométrie enfant optionnelle
}

// ── Composant ────────────────────────────────────────────
export function VolumeAbsorption({
    absorptionColor = [0.1, 0.5, 0.9],
    density = 0.1,
    maxThickness = 10.0,
    scatterColor = [0.2, 0.6, 1.0],
    scatterStrength = 0.15,
    children,
}: VolumeAbsorptionProps) {
    const { gl, camera, scene } = useThree()
    const matRef = useRef<ShaderMaterial>(null)

    // ── Render target avec depth texture ─────────────────
    const depthRT = useMemo(() => {
        // getDrawingBufferSize tient compte du devicePixelRatio
        const buf = new Vector2()
        gl.getDrawingBufferSize(buf)

        const dt = new DepthTexture(buf.x, buf.y)
        dt.type = UnsignedShortType
        return new WebGLRenderTarget(buf.x, buf.y, {
            depthTexture: dt,
            depthBuffer: true,
        })
    }, [gl])

    // ── Redimensionne le RT si le canvas change ───────────
    useEffect(() => {
        const buf = new Vector2()
        gl.getDrawingBufferSize(buf)
        depthRT.setSize(buf.x, buf.y)
        if (matRef.current) {
            matRef.current.uniforms.uResolution.value.set(buf.x, buf.y)
        }
    }, [gl, depthRT])

    // ── Uniforms initiaux ────────────────────────────────
    const uniforms = useMemo(() => {
        const buf = new Vector2()
        gl.getDrawingBufferSize(buf)          // ← clé du fix
        return {
            uDepthTexture: { value: depthRT.depthTexture },
            uResolution: { value: buf.clone() },
            uProjectionMatrixInverse: { value: camera.projectionMatrixInverse.clone() },
            uViewMatrixInverse: { value: camera.matrixWorld.clone() },
            uAbsorptionColor: { value: absorptionColor },
            uDensity: { value: density },
            uMaxThickness: { value: maxThickness },
            uScatterColor: { value: scatterColor },
            uScatterStrength: { value: scatterStrength },
        }
    }, [gl, camera, depthRT, absorptionColor, density,
        maxThickness, scatterColor, scatterStrength])

    // ── Boucle de rendu ──────────────────────────────────
    useFrame(() => {
        const mat = matRef.current
        if (!mat) return

        // 1. Rend la scène dans le RT (capture depth)
        gl.setRenderTarget(depthRT)
        gl.render(scene, camera)
        gl.setRenderTarget(null)

        // 2. Matrices caméra (se mettent à jour chaque frame)
        mat.uniforms.uProjectionMatrixInverse.value
            .copy(camera.projectionMatrixInverse)
        mat.uniforms.uViewMatrixInverse.value
            .copy(camera.matrixWorld)
    })

    return (
        <mesh>
            {children ?? <boxGeometry args={[200, 20, 200]} />}
            <shaderMaterial
                ref={matRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                side={DoubleSide}
            />
        </mesh>
    )
}