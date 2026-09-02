import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
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
  onSelectDefect: (defect: Defect) => void
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

function CarModel() {
  return (
    <group>
      <mesh position={[2.1, 0.5, 0.95]}>
        <boxGeometry args={[3.6, 0.5, 1.8]} />
        <HoloMaterial />
        <Edges color={HOLO} />
      </mesh>
      <mesh position={[2.1, 1.05, 0.95]}>
        <boxGeometry args={[1.6, 0.6, 1.4]} />
        <HoloMaterial opacity={0.12} />
        <Edges color={HOLO} />
      </mesh>
      <mesh position={[3.0, 1.0, 0.95]}>
        <boxGeometry args={[0.15, 0.55, 1.3]} />
        <meshStandardMaterial color="#67e8f9" transparent opacity={0.28} emissive="#67e8f9" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[1.2, 1.0, 0.95]}>
        <boxGeometry args={[0.15, 0.55, 1.3]} />
        <meshStandardMaterial color="#67e8f9" transparent opacity={0.28} emissive="#67e8f9" emissiveIntensity={0.6} />
      </mesh>
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
      <mesh position={[0.32, 0.55, 1.65]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0.32, 0.55, 0.25]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}

export const CarScene = forwardRef<CarSceneHandle, Props>(function CarScene(
  { product, defects, onSelectDefect },
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

  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [5.5, 3.2, 5.5], fov: 40 }}
      onCreated={(state) => {
        stateRef.current = state
      }}
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
        <DefectPin3D key={d.id} defect={d} position={[d.x, d.y, d.z]} onClick={() => onSelectDefect(d)} />
      ))}
      <Crosshair3D product={product} />
    </Canvas>
  )
})
