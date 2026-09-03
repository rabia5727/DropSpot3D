import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { Edges, Grid, Sparkles } from '@react-three/drei'
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

function HoloMaterial({ opacity = 0.16 }: { opacity?: number }) {
  return (
    <meshStandardMaterial
      color={HOLO}
      emissive={HOLO}
      emissiveIntensity={0.5}
      transparent
      opacity={opacity}
      side={THREE.DoubleSide}
    />
  )
}

const WHEEL_POSITIONS: [number, number, number][] = [
  [3.3, 0.28, 1.8],
  [3.3, 0.28, 0.1],
  [0.9, 0.28, 1.8],
  [0.9, 0.28, 0.1],
]

/**
 * Sedan side-profile silhouette (rear bumper -> trunk -> rear window ->
 * roof -> windshield -> hood -> front bumper), extruded straight across the
 * car's width. A continuous shape instead of stacked boxes - "cardboard
 * cutout" style, which suits the holographic look while reading as an
 * actual car body rather than a toy/shipping container.
 *
 * Not a copy of any specific make/model (that would be someone else's
 * trademarked design) - a generic realistic silhouette. Swap in a licensed
 * .glb/.gltf later if one becomes available; nothing else in the app
 * (placement, WebMCP tools, camera) depends on how the body is modeled.
 */
const BODY_WIDTH = 1.7
const BODY_Z_START = 0.1

// Profile points, used both to build the extrusion and to derive the
// windshield/rear-window glass angles below - single source of truth.
const REAR_BUMPER_BOTTOM: [number, number] = [0.1, 0.22]
const REAR_BUMPER_TOP: [number, number] = [0.05, 0.55]
const TRUNK: [number, number] = [0.55, 0.68]
const REAR_WINDOW_TOP: [number, number] = [1.35, 1.3]
const ROOF_FRONT: [number, number] = [2.55, 1.38]
const COWL: [number, number] = [3.25, 0.88]
const HOOD_FRONT: [number, number] = [3.9, 0.75]
const FRONT_BUMPER_BOTTOM: [number, number] = [4.15, 0.35]
const FRONT_BOTTOM: [number, number] = [4.05, 0.22]

function segmentAngle(a: [number, number], b: [number, number]) {
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}
function segmentLength(a: [number, number], b: [number, number]) {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}
function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function useCarBodyGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(...REAR_BUMPER_BOTTOM)
    shape.lineTo(...REAR_BUMPER_TOP)
    shape.lineTo(...TRUNK)
    shape.quadraticCurveTo(0.85, 0.85, ...REAR_WINDOW_TOP)
    shape.quadraticCurveTo(1.95, 1.48, ...ROOF_FRONT)
    shape.quadraticCurveTo(3.0, 1.25, ...COWL)
    shape.lineTo(...HOOD_FRONT)
    shape.quadraticCurveTo(4.1, 0.6, ...FRONT_BUMPER_BOTTOM)
    shape.lineTo(...FRONT_BOTTOM)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: BODY_WIDTH,
      bevelEnabled: false,
      curveSegments: 20,
    })
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

function GlassPane({ from, to }: { from: [number, number]; to: [number, number] }) {
  const angle = segmentAngle(from, to)
  const length = segmentLength(from, to)
  const [mx, my] = midpoint(from, to)
  return (
    <mesh position={[mx, my, BODY_Z_START + BODY_WIDTH / 2]} rotation={[0, 0, angle]}>
      <boxGeometry args={[length, 0.04, BODY_WIDTH * 0.82]} />
      <meshStandardMaterial color="#67e8f9" transparent opacity={0.28} emissive="#67e8f9" emissiveIntensity={0.6} />
    </mesh>
  )
}

function CarModel() {
  const bodyGeometry = useCarBodyGeometry()
  return (
    <group>
      <mesh geometry={bodyGeometry} position={[0, 0, BODY_Z_START]}>
        <HoloMaterial opacity={0.14} />
        <Edges color={HOLO} threshold={25} />
      </mesh>

      <GlassPane from={TRUNK} to={REAR_WINDOW_TOP} />
      <GlassPane from={ROOF_FRONT} to={COWL} />

      {WHEEL_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.22, 16]} />
          <HoloMaterial opacity={0.22} />
          <Edges color={HOLO} />
        </mesh>
      ))}
      <mesh position={[3.88, 0.55, 1.65]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[3.88, 0.55, 0.25]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.15, 0.55, 1.65]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.15, 0.55, 0.25]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}

const CAR_CENTER: [number, number, number] = [2.1, 0.7, 0.95]
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
