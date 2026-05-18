import * as THREE from "three";
import { useRef } from "react";
import OceanChunk from "@ocean/OceanChunk";
import { useFrame, useThree } from "@react-three/fiber";
import { LodDowngradeQualityTreshold, CHUNKS } from "@ocean/oceanConsts";

import { useDepthRenderTarget } from "@/src/hooks/useDepthRenderTarget";


const Ocean = () => {
    const { gl, scene } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const cameraOffsetRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0)); // ca c'est pour la position de la caméra et c'est dans un useRef pour ne pas faire de rendu a chaque fois, donc c'est bon
    const sharedDepthRT = useDepthRenderTarget() // Ca c'est pour rendre le fond de l'océan

    /// !! Honnêtement je vois pas l'intérêt propre pour l'instant
    // Depth pre-pass (priority -1 = before main render)
    useFrame(({ camera, size }) => {
        if (!groupRef.current) return;
        if (sharedDepthRT.width !== size.width || sharedDepthRT.height !== size.height) {
            sharedDepthRT.setSize(size.width, size.height);
        }
        groupRef.current.visible = false;
        gl.setRenderTarget(sharedDepthRT);
        gl.clear();
        gl.render(scene, camera);
        gl.setRenderTarget(null);
        groupRef.current.visible = true;
        cameraOffsetRef.current.set(camera.position.x, camera.position.z);
    }, -1);

    return (
        // <OceanContext.Provider value={{ disturbtion, currentDirection, waveLayers: activeLayers }}>

        <group ref={groupRef}>
            {CHUNKS.map(({ row, col, ring, resolution, tileSize, gridOffset }) => (
                <OceanChunk
                    key={`chunk_${row}_${col}`}
                    id={`chunk_${row}_${col}`}
                    tileSize={tileSize}
                    gridOffset={gridOffset}
                    cameraOffsetRef={cameraOffsetRef}
                    resolution={resolution}
                    depthRT={sharedDepthRT}
                    downgradeQuality={ring >= LodDowngradeQualityTreshold}
                />
            ))}
        </group>

    );
};

export default Ocean;
