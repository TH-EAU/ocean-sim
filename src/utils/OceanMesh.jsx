// ============================================================
//  OceanMesh.jsx — R3F component
//  Branche le shader ocean.vert.glsl / ocean.frag.glsl
// ============================================================

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useDepthBuffer } from '@react-three/drei'
import * as THREE from 'three'

import vertexShader   from './ocean.vert.glsl'
import fragmentShader from './ocean.frag.glsl'

// ── Props par défaut ─────────────────────────────────────────
//  envMap      : CubeTexture (PMREMGenerator ou RGBELoader)
//  waveHeight  : float — amplitude globale des vagues
//  waveDirection : [x, z] — direction principale
//  deepColor   : THREE.Color — couleur eau profonde
//  shallowColor : THREE.Color — couleur eau peu profonde / crête
//  depthScale  : float — profondeur de référence en unités monde

export default function OceanMesh({
  envMap,
  waveHeight    = 0.8,
  waveDirection = [1.0, 0.3],
  deepColor     = new THREE.Color(0x021520),
  shallowColor  = new THREE.Color(0x1acfb0),
  depthScale    = 5.0,
}) {
  const meshRef     = useRef()
  const { size, camera } = useThree()

  // ── Depth buffer ─────────────────────────────────────────
  // useDepthBuffer de drei rend le depth buffer de la scène
  // dans un WebGLRenderTarget, résolution divisée par 2 par défaut.
  // Le mesh eau doit être exclu de ce pass → voir note ci-dessous.
  const depthBuffer = useDepthBuffer({ frames: 1, size: 1 })
  //
  // ⚠️  Pour exclure le mesh eau du depth buffer :
  //    1. Mets le mesh eau sur layers.set(1)
  //    2. Dans le before callback de useDepthBuffer, filtre layer 1
  //    Sinon le fond sous l'eau sera le mesh eau lui-même.
  //    C'est la seule chose à faire côté R3F, pas besoin de render target custom.

  // ── Uniforms ─────────────────────────────────────────────
  const uniforms = useMemo(() => ({
    uTime:                     { value: 0 },
    uResolution:               { value: new THREE.Vector2(size.width, size.height) },
    uWaveHeight:               { value: waveHeight },
    uWaveDirection:            { value: new THREE.Vector2(...waveDirection) },

    // Depth
    uDepthTexture:             { value: depthBuffer.depthTexture },
    uProjectionMatrixInverse:  { value: camera.projectionMatrixInverse.clone() },
    uViewMatrixInverse:        { value: camera.matrixWorld.clone() },

    // Couleurs
    uDeepColor:                { value: deepColor },
    uShallowColor:             { value: shallowColor },
    uDepthScale:               { value: depthScale },

    // Réflexion env map (phase 1)
    uEnvMap:                   { value: envMap ?? null },

    // ── Phase 2 — à décommenter quand prêt ──────────────────
    // uSceneTexture:          { value: null }, // render target couleur scène
    // uReflectorMap:          { value: null }, // Reflector render target
    // uReflectorMatrix:       { value: new THREE.Matrix4() },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps
  //
  // Note : les uniforms sont mutés dans useFrame — pas besoin de les recréer.

  // ── Boucle de rendu ───────────────────────────────────────
  useFrame((state) => {
    const u = meshRef.current?.material?.uniforms
    if (!u) return

    // Temps
    u.uTime.value = state.clock.elapsedTime

    // Résolution (si resize)
    u.uResolution.value.set(state.size.width, state.size.height)

    // Matrices caméra (mises à jour chaque frame car la caméra bouge)
    u.uProjectionMatrixInverse.value.copy(state.camera.projectionMatrixInverse)
    u.uViewMatrixInverse.value.copy(state.camera.matrixWorld)

    // ── Phase 2 ──────────────────────────────────────────────
    // Quand tu auras le Reflector :
    //   u.uReflectorMap.value   = reflector.renderTarget.texture
    //   u.uReflectorMatrix.value = reflector.textureMatrix
    //
    // Quand tu auras le render target scène :
    //   u.uSceneTexture.value = sceneRenderTarget.texture
  })

  // ── Géométrie ─────────────────────────────────────────────
  // PlaneGeometry avec assez de segments pour les vagues Gerstner.
  // 256×256 est un bon compromis perf/qualité pour un océan.
  // Augmente si tu veux des vagues très détaillées au près.
  const geometry = useMemo(() =>
    new THREE.PlaneGeometry(200, 200, 256, 256)
  , [])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}  // plan horizontal
    >
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}

// ============================================================
//  Exemple d'intégration dans ta scène :
//
//  import { useEnvironment } from '@react-three/drei'
//  import OceanMesh from './OceanMesh'
//
//  function Scene() {
//    const envMap = useEnvironment({ preset: 'sunset' })
//    return (
//      <>
//        <OceanMesh
//          envMap={envMap}
//          waveHeight={0.8}
//          waveDirection={[1, 0.3]}
//          deepColor={new THREE.Color(0x021520)}
//          shallowColor={new THREE.Color(0x1acfb0)}
//          depthScale={5.0}
//        />
//        {/* reste de la scène */}
//      </>
//    )
//  }
// ============================================================
