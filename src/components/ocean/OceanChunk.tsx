import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { applyFragmentChunk, applyVertexChunk, handleDepthMaterial } from "./oceanUtils/shaders";
import {
    TERRAIN_BOUNDS,
    SEC_NOISE_SCALE,
    SEC_NOISE_STRENGTH,
    DEFAULT_WAVE_LAYERS,
} from "./oceanConsts";
import heightmapUrl from "../../assets/heightmap.png";

interface OceanChunk {
    id: string;
    depthRT: THREE.WebGLRenderTarget;
    /** Fixed offset of this chunk in the LOD grid (relative to origin, does not change) */
    gridOffset?: [number, number];
    /** Shared ref to camera XZ position — read each frame without triggering re-renders */
    cameraOffsetRef?: RefObject<THREE.Vector2>;
    tileSize?: number;
    resolution?: number;
    renderOrder?: number;
    downgradeQuality?: boolean;
    waveDirAmp: THREE.Vector4[];
    waveParams: THREE.Vector4[];
    waveExtra: THREE.Vector4[];
    numCarrierWaves?: number;
    secondaryNoiseScale?: number;
    secondaryNoiseStrength?: number;
}

const chunkUniformsStore = new Map<string, Record<string, THREE.IUniform>>();

const OceanChunk = ({
    id,
    depthRT,
    gridOffset = [0, 0],
    cameraOffsetRef,
    tileSize = 60,
    resolution = 256,
    renderOrder = 0,
    downgradeQuality = false,
    waveDirAmp,
    waveParams,
    waveExtra,
    numCarrierWaves = DEFAULT_WAVE_LAYERS.length,
    secondaryNoiseScale,
    secondaryNoiseStrength,
}: OceanChunk) => {
    const { gl } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const heightmap = useTexture(heightmapUrl);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uResolution: {
                value: new THREE.Vector2(
                    gl.getSize(new THREE.Vector2()).x,
                    gl.getSize(new THREE.Vector2()).y,
                ),
            },
            uTileOffset: { value: new THREE.Vector2(0, 0) },
            uDepthTexture: { value: depthRT.depthTexture },
            uDepthScale: { value: 21.1 },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 10000 },
            uSunDirection: { value: new THREE.Vector3(0.6, 0.3, 0.7).normalize() },
            uFresnelPower: { value: 0.5 },
            // Multi-wave arrays
            uWaveDirAmp: { value: waveDirAmp },
            uWaveParams: { value: waveParams },
            uWaveExtra: { value: waveExtra },
            uWaveCount: { value: waveDirAmp.length },
            uNumCarrierWaves: { value: numCarrierWaves },
            // Secondary noise envelope
            uSecondaryNoiseScale: { value: secondaryNoiseScale ?? SEC_NOISE_SCALE },
            uSecondaryNoiseStrength: { value: secondaryNoiseStrength ?? SEC_NOISE_STRENGTH },
            // Heightmap attenuation
            uHeightmap: { value: heightmap },
            uTerrainBounds: { value: TERRAIN_BOUNDS },
            uTerrainDamping: { value: 0.85 },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [gl, depthRT, heightmap],
    );

    const injectShader = useCallback(
        (shader: THREE.WebGLProgramParametersWithUniforms) => {
            applyVertexChunk(shader, uniforms, true, downgradeQuality);
            applyFragmentChunk(shader, downgradeQuality);
        },
        [uniforms, downgradeQuality],
    );

    const depthMaterial = useMemo(
        () => handleDepthMaterial(uniforms, id),
        [uniforms],
    );

    useEffect(() => {
        chunkUniformsStore.set(id, uniforms);
        return () => { chunkUniformsStore.delete(id); };
    }, [id, uniforms]);

    // Update wave arrays in-place when they change
    useEffect(() => {
        uniforms.uWaveDirAmp.value = waveDirAmp;
        uniforms.uWaveParams.value = waveParams;
        uniforms.uWaveExtra.value = waveExtra;
        uniforms.uWaveCount.value = waveDirAmp.length;
    }, [uniforms, waveDirAmp, waveParams, waveExtra]);

    useEffect(() => {
        uniforms.uNumCarrierWaves.value = numCarrierWaves;
    }, [uniforms, numCarrierWaves]);

    useEffect(() => {
        uniforms.uSecondaryNoiseScale.value = secondaryNoiseScale ?? SEC_NOISE_SCALE;
        uniforms.uSecondaryNoiseStrength.value = secondaryNoiseStrength ?? SEC_NOISE_STRENGTH;
    }, [uniforms, secondaryNoiseScale, secondaryNoiseStrength]);

    useFrame((state) => {
        const u = chunkUniformsStore.get(id);
        if (!u) return;

        u.uTime.value = state.clock.elapsedTime;
        u.uResolution.value.set(state.size.width, state.size.height);
        u.cameraNear.value = state.camera.near;
        u.cameraFar.value = state.camera.far;

        // Update world position directly — no React state, no re-renders
        if (meshRef.current) {
            const camX = cameraOffsetRef?.current?.x ?? 0;
            const camZ = cameraOffsetRef?.current?.y ?? 0;
            const wx = camX + gridOffset[0];
            const wz = camZ + gridOffset[1];
            meshRef.current.position.set(wx, 0, wz);
            u.uTileOffset.value.set(wx, wz);
        }
    });

    return (
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={renderOrder}
            frustumCulled={false}
            receiveShadow
            castShadow
            customDepthMaterial={depthMaterial}
        >
            <planeGeometry args={[tileSize, tileSize, resolution, resolution]} />
            <meshStandardMaterial
                onBeforeCompile={injectShader}
                customProgramCacheKey={() => downgradeQuality ? `ocean_low` : `ocean_high`}
                transparent
                roughness={0}
                depthWrite={true}
                side={THREE.FrontSide}
            />
        </mesh>
    );
};

export default OceanChunk;
