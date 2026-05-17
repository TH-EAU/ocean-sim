/**
 * @param disturbtion
 * Ce paramètre détermine si la mer est calme ou agitée. Ce paramètre est valable pour tout le LOD
 *
 * @param currentDirection
 * C'est la direction du courant, elle détermine aussi la direction des vagues porteuses. Je le donne en degrés
 *
 * @param windSpeed
 * Vitesse de base du vent en m/s. Varie dynamiquement dans useFrame (±20%).
 */

import * as THREE from "three";
import React, { useMemo, useRef } from "react";
import OceanChunk from "./OceanChunk";
import { useFrame, useThree } from "@react-three/fiber";
import { OceanContext } from "./OceanContext";

interface OceanLOD {
    baseTileSize: number
    gridRadius: number
    levels: number[]
}

interface OceanProps {
    disturbtion?:     number
    currentDirection?: number
    windSpeed?:        number
    windAngleRef?:     React.RefObject<number>
    windSpeedRef?:     React.RefObject<number>
    lod?:              OceanLOD
    children?:         React.ReactNode
}

// Tile size for a given axis slot index (0 = center): doubles each step
const tileSizeForAxisIndex = (base: number, n: number): number =>
    base * Math.pow(2, n);

// Tile size for a chunk at the given ring level
const computeTileSize = (base: number, ring: number): number =>
    base * Math.pow(2, ring);

// World-space center offset for chunk (row, col), accumulating axis sizes independently.
const computeGridOffset = (row: number, col: number, base: number): [number, number] => {
    let ox = 0;
    for (let c = 0; c < Math.abs(col); c++) {
        ox += (tileSizeForAxisIndex(base, c) + tileSizeForAxisIndex(base, c + 1)) / 2;
    }
    let oz = 0;
    for (let r = 0; r < Math.abs(row); r++) {
        oz += (tileSizeForAxisIndex(base, r) + tileSizeForAxisIndex(base, r + 1)) / 2;
    }
    return [Math.sign(col) * ox, Math.sign(row) * oz];
};

const Ocean = ({
    disturbtion = 0.3,
    currentDirection: currentDirectionDeg = 0,
    windSpeed = 5,
    windAngleRef,
    windSpeedRef,
    lod = { baseTileSize: 100, gridRadius: 5, levels: [128, 128, 64, 8, 1] },
    children,
}: OceanProps) => {
    const { gl, scene } = useThree();
    const groupRef = useRef<THREE.Group>(null);

    const currentDirection = useMemo<[number, number]>(() => {
        const rad = currentDirectionDeg * (Math.PI / 180);
        return [Math.cos(rad), Math.sin(rad)];
    }, [currentDirectionDeg]);

    const baseAngle = currentDirectionDeg * (Math.PI / 180);

    const cameraOffsetRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

    const sharedDepthRT = useMemo(() => {
        const dt = new THREE.DepthTexture(0, 0);
        dt.type = THREE.UnsignedShortType;
        return new THREE.WebGLRenderTarget(0, 0, {
            depthTexture: dt,
            depthBuffer: true,
        });
    }, []);

    const chunks = useMemo(() => {
        const list: {
            row: number;
            col: number;
            resolution: number;
            tileSize: number;
            ring: number;
            gridOffset: [number, number];
        }[] = [];
        for (let row = -lod.gridRadius; row <= lod.gridRadius; row++) {
            for (let col = -lod.gridRadius; col <= lod.gridRadius; col++) {
                const ring = Math.max(Math.abs(row), Math.abs(col));
                const resolution = lod.levels[Math.min(ring, lod.levels.length - 1)];
                const tileSize = computeTileSize(lod.baseTileSize, ring);
                const gridOffset = computeGridOffset(row, col, lod.baseTileSize);
                list.push({ row, col, ring, resolution, tileSize, gridOffset });
            }
        }
        return list;
    }, []);

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

    // Dynamic wind variation — slow drift around base direction, ±20% speed
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (windAngleRef) windAngleRef.current = baseAngle + 0.3 * Math.sin(t * 0.07);
        if (windSpeedRef) windSpeedRef.current = windSpeed * (0.8 + 0.2 * Math.sin(t * 0.05));
    });

    return (
        <OceanContext.Provider value={{ disturbtion, currentDirection, currentSpeed: 0, windSpeed }}>
            <group ref={groupRef}>
                {chunks.map(({ row, col, ring, resolution, tileSize, gridOffset }) => (
                    <OceanChunk
                        key={`chunk_${row}_${col}`}
                        id={`chunk_${row}_${col}`}
                        tileSize={tileSize}
                        gridOffset={gridOffset}
                        cameraOffsetRef={cameraOffsetRef}
                        resolution={resolution}
                        depthRT={sharedDepthRT}
                        downgradeQuality={ring >= 4}
                        disturbtion={disturbtion}
                        currentDirection={currentDirection}
                    />
                ))}
            </group>
            {children}
        </OceanContext.Provider>
    );
};

export default Ocean;
