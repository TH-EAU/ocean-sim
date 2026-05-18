import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { applyFragmentChunk, applyVertexChunk } from "@ocean/oceanUtils/shaders";
import { useShaderInjection } from "@/src/hooks/useShaderInjection";
import { useDepthMaterial } from "@/src/hooks/useDepthMaterial";
import type oceanChunk from "@/src/types/OceanChunk";
import { useOcean } from "@/src/contexts/OceanContext";

const OceanChunk = ({
    id, // good
    depthRT, // good
    gridOffset, // good
    cameraOffsetRef, // good
    tileSize, // good
    resolution, // good
    renderOrder = 0, // good
    downgradeQuality = false, // good
}: oceanChunk) => {
    const { gl } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const { waveLayers } = useOcean()

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            // Fragment
            uResolution: {
                value: new THREE.Vector2(
                    gl.getSize(new THREE.Vector2()).x,
                    gl.getSize(new THREE.Vector2()).y,
                ),
            },
            uDepthTexture: { value: depthRT.depthTexture },
            uDepthScale: { value: 21.1 },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 10000 },
            uSunDirection: { value: new THREE.Vector3(0.6, 0.3, 0.7).normalize() },
            uFresnelPower: { value: 0.5 },

            // Vertex
            uTileOffset: { value: new THREE.Vector2(0, 0) },
            uWaves: {
                value: waveLayers.map(w => ({
                    direction: new THREE.Vector2(...w.direction),
                    amplitude: w.amplitude,
                    wavelength: w.wavelength,
                    steepness: w.steepness,
                    speed: w.speed,
                }))
            }
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [gl, depthRT],
    );

    const injectedShader = useShaderInjection({ uniforms, downgradeQuality, applyVertexChunk, applyFragmentChunk });
    const depthMaterial = useDepthMaterial({ uniforms, chunkId: id, applyVertexChunk });

    useFrame((state) => {
        uniforms.uTime.value = state.clock.elapsedTime;
        uniforms.uResolution.value.set(state.size.width, state.size.height);
        uniforms.cameraNear.value = state.camera.near;
        uniforms.cameraFar.value = state.camera.far;

        if (meshRef.current) {
            const camX = cameraOffsetRef?.current?.x ?? 0; // ça n'est pas la caméra qui est mises a jour mais la position des chunks qui bouge
            const camZ = cameraOffsetRef?.current?.y ?? 0;
            const wx = camX + gridOffset[0]; // C'est le grid Offset qui permet de determiner la bonne place dans le LOD
            const wz = camZ + gridOffset[1];
            meshRef.current.position.set(wx, 0, wz);
            uniforms.uTileOffset.value.set(wx, wz); // uTileOffeset permet de calibrer les vagues sur un ocean continu
        }
    });

    return (
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={renderOrder}
            // frustumCulled={false} // bad ?
            receiveShadow
            castShadow
            customDepthMaterial={depthMaterial}
        >
            <planeGeometry args={[tileSize, tileSize, resolution, resolution]} />
            <meshStandardMaterial
                onBeforeCompile={injectedShader}
                customProgramCacheKey={() => downgradeQuality ? `ocean_low` : `ocean_high`}
                transparent
                roughness={1}
                depthWrite={true}
                side={THREE.FrontSide}
            />
        </mesh>
    );
};

export default OceanChunk;
