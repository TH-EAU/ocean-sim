import { OrbitControls, Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber"
import { useRef, type ReactNode } from "react"
import { SUN_DIR } from "../ocean/oceanConsts";

const Scene: React.FC<{ children: ReactNode }> = ({ children }) => {
    const orbitControlsRef = useRef<any>(null);
    return (
        <Canvas
            camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 1000 }}
            gl={{ antialias: true }}
            shadows="soft"
        >
            <Sky sunPosition={SUN_DIR} />
            <ambientLight intensity={3.3} color="#1a2a4a" />
            <directionalLight
                position={SUN_DIR}
                intensity={2.0}
                color="#fff5e0"
                castShadow
                shadow-camera-left={-40}
                shadow-camera-right={40}
                shadow-camera-top={40}
                shadow-camera-bottom={-40}
                shadow-camera-near={1}
                shadow-camera-far={400}
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.002}
            />
            {children}
            <OrbitControls
                ref={orbitControlsRef}
                enableDamping
                zoom0={10}
                dampingFactor={0.08}
                minDistance={3}
                maxDistance={1145}
                maxPolarAngle={Math.PI / 2.1}
            />
        </Canvas>
    )
}

export default Scene;