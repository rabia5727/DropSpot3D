import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { Product } from '../lib/types'

interface Props {
  product: Product | null
}

interface Target {
  x: number
  y: number
  z: number
}

/** Where the reticle starts its sweep from - hovering above the car. */
const START: [number, number, number] = [2.1, 2.4, 0.95]
const SWEEP_MS = 800

/**
 * 3D equivalent of the 2D crosshair sweep: the agent's targeting reticle
 * flies from a fixed starting point to the defect's real (x,y,z) world
 * coordinate before the pin drops, so the scene reads as "the AI is
 * scanning this" rather than a marker teleporting in.
 */
export function Crosshair3D({ product }: Props) {
  const [target, setTarget] = useState<Target | null>(null)
  const [visible, setVisible] = useState(false)
  const groupRef = useRef<Group>(null)
  const startTime = useRef(0)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as {
        x: number
        y: number
        z: number
        productId: string
      }
      if (!product || detail.productId !== product.id) return
      setTarget({ x: detail.x, y: detail.y, z: detail.z })
      setVisible(true)
      startTime.current = performance.now()
      const timer = setTimeout(() => setVisible(false), 900)
      return () => clearTimeout(timer)
    }
    window.addEventListener('agent-target', handler)
    return () => window.removeEventListener('agent-target', handler)
  }, [product])

  useFrame(() => {
    if (!groupRef.current || !target) return
    const elapsed = (performance.now() - startTime.current) / SWEEP_MS
    const t = Math.min(1, elapsed)
    const eased = 1 - Math.pow(1 - t, 3)
    groupRef.current.position.set(
      START[0] + (target.x - START[0]) * eased,
      START[1] + (target.y - START[1]) * eased,
      START[2] + (target.z - START[2]) * eased,
    )
    const flashProgress = t >= 1 ? Math.min(1, (elapsed - 1) * 4) : 0
    groupRef.current.scale.setScalar(1 + (1 - flashProgress) * 0.3)
  })

  if (!visible || !target) return null

  return (
    <group ref={groupRef} position={START}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.15, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.22, 24]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
