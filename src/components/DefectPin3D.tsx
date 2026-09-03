import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Defect } from '../lib/types'
import { SEVERITY_COLORS } from '../lib/types'

interface Props {
  defect: Defect
  position: [number, number, number]
  /** true when a different defect is focused - fades this one into the background. */
  dimmed: boolean
  onClick: () => void
}

export const BEAM_HEIGHT = 0.5

export function DefectPin3D({ defect, position, dimmed, onClick }: Props) {
  const color = defect.severity ? SEVERITY_COLORS[defect.severity] : '#9ca3af'
  const groupRef = useRef<THREE.Group>(null)
  const sphereRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const mountedAt = useRef(performance.now())

  useFrame((_, delta) => {
    const t = (performance.now() - mountedAt.current) / 1000

    if (sphereRef.current) {
      const settle = Math.min(1, t / 0.4)
      const overshoot = settle < 1 ? Math.sin(settle * Math.PI) * 0.3 * (1 - settle) : 0
      sphereRef.current.scale.setScalar(Math.max(0.001, settle + overshoot))
    }

    if (ringRef.current && defect.severity === 'high') {
      const cycle = (t % 1.6) / 1.6
      ringRef.current.scale.setScalar(1 + cycle * 1.8)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.5 * (1 - cycle) * (dimmed ? 0.2 : 1)
    }

    if (groupRef.current) {
      const targetOpacity = dimmed ? 0.12 : 1
      const lerpFactor = 1 - Math.pow(0.001, delta)
      groupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj !== ringRef.current) {
          const mat = obj.material as THREE.Material & { opacity: number }
          mat.opacity += (targetOpacity * (mat.userData.baseOpacity ?? 1) - mat.opacity) * lerpFactor
        }
      })
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, BEAM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, BEAM_HEIGHT, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} userData={{ baseOpacity: 0.5 }} />
      </mesh>

      <mesh
        ref={sphereRef}
        position={[0, BEAM_HEIGHT, 0]}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={1}
          userData={{ baseOpacity: 1 }}
        />
      </mesh>

      {defect.severity === 'high' && (
        <mesh ref={ringRef} position={[0, BEAM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.09, 0.11, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {defect.source === 'agent' && (
        <mesh position={[0.1, BEAM_HEIGHT + 0.1, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={2}
            transparent
            opacity={1}
            userData={{ baseOpacity: 1 }}
          />
        </mesh>
      )}

      {defect.suggestion_status === 'pending' && (
        <mesh position={[-0.1, BEAM_HEIGHT + 0.1, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#fde047"
            emissiveIntensity={2}
            transparent
            opacity={1}
            userData={{ baseOpacity: 1 }}
          />
        </mesh>
      )}
    </group>
  )
}
