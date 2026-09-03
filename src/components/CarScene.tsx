import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { Grid, Sparkles, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Defect, Product } from '../lib/types'
import { DefectPin3D } from './DefectPin3D'
import { Crosshair3D } from './Crosshair3D'

export interface CarSceneHandle {
  /** Raycasts from a client-space (mouse/pointer) coordinate into the car model, returning the hit world point or null on a miss. */
  raycastFromClient: (clientX: number, clientY: number) => [number, number, number] | null
}

interface Props {
  product: Product
  defects: Defect[]
  selectedDefectId: string | null
  onSelectDefect: (defect: Defect) => void
  onDeselect: () => void
}

const HOLO = '#22d3ee'
const MODEL_PATH = '/models/car.glb'
const TARGET_LENGTH = 4.2 // matches CAR_ZONES / camera convention below, regardless of the source model's native scale

/**
 * "Generic Sedan Car" by MMC Works (sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5),
 * CC-BY 4.0 - an original generic design, not modeled after any specific
 * real make/model. Credited in README.md per the license.
 *
 * Auto-fit into our established world-space convention regardless of the
 * file's native scale/orientation: computes the real bounding box, picks
 * whichever horizontal axis is longer as "length" (rotating 90° if that's Z
 * not X), then scales/offsets so it occupies the same 0..TARGET_LENGTH box
 * our CAR_ZONES and camera math already assume - so nothing else in the
 * scene needs to know how the source file happened to be authored.
 */
function useNormalizedCarScene() {
  const gltf = useGLTF(MODEL_PATH)

  return useMemo(() => {
    const source = gltf.scene.clone(true)

    // Give real materials a translucent holographic tint while keeping their
    // own color/detail visible - keeps the "hologram" identity without
    // hiding the realistic geometry we specifically swapped in for.
    source.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const applyHolo = (mat: THREE.Material) => {
          const m = mat.clone() as THREE.MeshStandardMaterial
          m.transparent = true
          m.opacity = 0.72
          m.emissive = new THREE.Color(HOLO)
          m.emissiveIntensity = 0.22
          m.side = THREE.DoubleSide
          return m
        }
        obj.material = Array.isArray(obj.material) ? obj.material.map(applyHolo) : applyHolo(obj.material)
      }
    })

    const rawBox = new THREE.Box3().setFromObject(source)
    const rawSize = new THREE.Vector3()
    rawBox.getSize(rawSize)
    const lengthIsAlongX = rawSize.x >= rawSize.z

    const oriented = new THREE.Group()
    oriented.add(source)
    if (!lengthIsAlongX) oriented.rotation.y = Math.PI / 2

    const orientedBox = new THREE.Box3().setFromObject(oriented)
    const orientedSize = new THREE.Vector3()
    orientedBox.getSize(orientedSize)
    const scale = orientedSize.x > 0 ? TARGET_LENGTH / orientedSize.x : 1

    const offset = orientedBox.min.clone().multiplyScalar(-scale)

    return { object: oriented, scale, offset }
  }, [gltf])
}

export function CarModel() {
  const { object, scale, offset } = useNormalizedCarScene()
  return (
    <group scale={scale} position={[offset.x, offset.y, offset.z]}>
      <primitive object={object} />
    </group>
  )
}

useGLTF.preload(MODEL_PATH)

export const CAR_CENTER: [number, number, number] = [2.05, 0.55, 0.95]
const DEFAULT_CAM_POS: [number, number, number] = [5.5, 3.2, 5.5]
const OUTWARD_OFFSET = 0.9
const HOVER_HEIGHT = 0.45

/**
 * Scripted camera - not free orbit controls. Flies to a fixed overview
 * position/lookAt when nothing is selected, or - when a defect is focused -
 * moves OUTWARD from the car's center through the defect point plus a hover
 * offset, and looks at the defect.
 *
 * That "outward from center" construction is the actual fix for the bug
 * where the camera used to land inside the hollow body: since every defect
 * sits on the surface, going further out along the same center->defect ray
 * can never end up inside the shell, regardless of which side of the car
 * the defect is on.
 */
function CameraRig({ focusPoint }: { focusPoint: [number, number, number] | null }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(...DEFAULT_CAM_POS))
  const targetLookAt = useRef(new THREE.Vector3(...CAR_CENTER))
  const currentLookAt = useRef(new THREE.Vector3(...CAR_CENTER))
  const initialized = useRef(false)

  if (!initialized.current) {
    camera.position.set(...DEFAULT_CAM_POS)
    initialized.current = true
  }

  if (focusPoint) {
    const center = new THREE.Vector3(...CAR_CENTER)
    const defect = new THREE.Vector3(...focusPoint)
    const outward = defect.clone().sub(center)
    if (outward.lengthSq() < 1e-6) outward.set(1, 0, 0)
    outward.normalize()
    targetPos.current
      .copy(defect)
      .addScaledVector(outward, OUTWARD_OFFSET)
      .add(new THREE.Vector3(0, HOVER_HEIGHT, 0))
    targetLookAt.current.copy(defect)
  } else {
    targetPos.current.set(...DEFAULT_CAM_POS)
    targetLookAt.current.set(...CAR_CENTER)
  }

  useFrame((_, delta) => {
    const lerpFactor = 1 - Math.pow(0.001, delta)
    camera.position.lerp(targetPos.current, lerpFactor)
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor)
    camera.lookAt(currentLookAt.current)
  })

  return null
}

export const CarScene = forwardRef<CarSceneHandle, Props>(function CarScene(
  { product, defects, selectedDefectId, onSelectDefect, onDeselect },
  ref,
) {
  const stateRef = useRef<RootState | null>(null)
  const carGroupRef = useRef<THREE.Group>(null)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  useImperativeHandle(ref, () => ({
    raycastFromClient(clientX, clientY) {
      const state = stateRef.current
      const group = carGroupRef.current
      if (!state || !group) return null
      const rect = state.gl.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
      if (ndcX < -1 || ndcX > 1 || ndcY < -1 || ndcY > 1) return null
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera)
      const hits = raycaster.intersectObject(group, true)
      if (hits.length === 0) return null
      const p = hits[0].point
      return [p.x, p.y, p.z]
    },
  }))

  const selectedDefect = defects.find((d) => d.id === selectedDefectId) ?? null
  const focusPoint: [number, number, number] | null = selectedDefect
    ? [selectedDefect.x, selectedDefect.y, selectedDefect.z]
    : null

  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: DEFAULT_CAM_POS, fov: 40 }}
      onCreated={(state) => {
        stateRef.current = state
      }}
      onPointerMissed={onDeselect}
    >
      <color attach="background" args={['#050810']} />
      <fog attach="fog" args={['#050810', 6, 16]} />
      <ambientLight intensity={0.5} color="#22d3ee" />
      <pointLight position={[3, 4, 3]} intensity={40} color="#67e8f9" />
      <pointLight position={[-2, 2, -2]} intensity={20} color="#a78bfa" />
      <Grid
        position={[2.1, 0, 0.95]}
        args={[12, 12]}
        cellColor="#0e7490"
        sectionColor="#22d3ee"
        fadeDistance={14}
        infiniteGrid
      />
      <Sparkles count={40} scale={5} size={2} speed={0.3} color="#67e8f9" position={[2.1, 1, 0.95]} />
      <group ref={carGroupRef}>
        <CarModel />
      </group>
      {defects.map((d) => (
        <DefectPin3D
          key={d.id}
          defect={d}
          position={[d.x, d.y, d.z]}
          dimmed={selectedDefectId !== null && d.id !== selectedDefectId}
          onClick={() => onSelectDefect(d)}
        />
      ))}
      <Crosshair3D product={product} />
      <CameraRig focusPoint={focusPoint} />
    </Canvas>
  )
})
