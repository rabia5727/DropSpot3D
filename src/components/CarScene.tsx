import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Grid, OrbitControls, Sparkles, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Defect, Product } from '../lib/types'
import { DefectPin3D } from './DefectPin3D'
import { Crosshair3D } from './Crosshair3D'

interface Props {
  product: Product
  defects: Defect[]
  selectedDefectId: string | null
  onSelectDefect: (defect: Defect) => void
  onDeselect: () => void
  /** Fires with the exact 3D surface point when the car body itself (not a pin) is clicked. */
  onPlaceAt: (point: [number, number, number]) => void
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

const ARRIVED_EPSILON = 0.05

/**
 * Free orbit when nothing's selected (drag to rotate, scroll to zoom, around
 * CAR_CENTER) - but clicking a defect hands full control to a scripted fly-in
 * that moves OUTWARD from the car's center through the defect point plus a
 * hover offset, so it looks down at the defect instead of just landing at a
 * generic distance. That "outward from center" construction is also the fix
 * for a bug where the camera used to land inside the hollow body: since every
 * defect sits on the surface, going further out along the same center->defect
 * ray can never end up inside the shell, regardless of which side it's on.
 *
 * OrbitControls is only ever MOUNTED while idle and "arrived home" - not just
 * `enabled={false}` while focused - because drei's OrbitControls keeps
 * re-asserting the camera position from its own internal state every frame
 * even when input-disabled, which would fight the scripted fly-in. Fully
 * unmounting it hands the camera over cleanly.
 */
function CameraController({ focusPoint }: { focusPoint: [number, number, number] | null }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(...DEFAULT_CAM_POS))
  const targetLookAt = useRef(new THREE.Vector3(...CAR_CENTER))
  const currentLookAt = useRef(new THREE.Vector3(...CAR_CENTER))
  const [arrivedHome, setArrivedHome] = useState(true)

  const focusKey = focusPoint ? focusPoint.join(',') : null
  useEffect(() => {
    if (focusKey) setArrivedHome(false)
  }, [focusKey])

  useFrame((_, delta) => {
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
    } else if (!arrivedHome) {
      targetPos.current.set(...DEFAULT_CAM_POS)
      targetLookAt.current.set(...CAR_CENTER)
      if (camera.position.distanceTo(targetPos.current) < ARRIVED_EPSILON) {
        setArrivedHome(true)
      }
    } else {
      return // idle and home - OrbitControls owns the camera, don't fight it
    }

    const lerpFactor = 1 - Math.pow(0.001, delta)
    camera.position.lerp(targetPos.current, lerpFactor)
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor)
    camera.lookAt(currentLookAt.current)
  })

  if (!focusPoint && arrivedHome) {
    return <OrbitControls target={CAR_CENTER} enablePan={false} minDistance={2.5} maxDistance={11} />
  }
  return null
}

export function CarScene({
  product,
  defects,
  selectedDefectId,
  onSelectDefect,
  onDeselect,
  onPlaceAt,
}: Props) {
  const selectedDefect = defects.find((d) => d.id === selectedDefectId) ?? null
  const focusPoint: [number, number, number] | null = selectedDefect
    ? [selectedDefect.x, selectedDefect.y, selectedDefect.z]
    : null

  function handleCarClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    onPlaceAt([e.point.x, e.point.y, e.point.z])
  }

  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: DEFAULT_CAM_POS, fov: 40 }}
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
      <group onClick={handleCarClick}>
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
      <CameraController focusPoint={focusPoint} />
    </Canvas>
  )
}
