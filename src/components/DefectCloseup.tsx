import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import type { Defect } from '../lib/types'
import { CAR_CENTER, CarModel } from './CarScene'
import { BEAM_HEIGHT, DefectPin3D } from './DefectPin3D'

interface Props {
  defect: Defect
}

const CLOSEUP_OFFSET = 0.32
const CLOSEUP_HOVER = 0.14

/**
 * Picture-in-picture magnified render of the focused defect - a second,
 * separate Canvas (not the main one) framed extremely close on just that
 * marker and the car surface immediately around it, like leaning in with a
 * magnifying glass. Keyed by defect.id so it mounts fresh (and computes a
 * fresh static camera) each time the focused defect changes, rather than
 * needing frame-by-frame camera animation like the main scene's rig.
 */
export function DefectCloseup({ defect }: Props) {
  const center = new THREE.Vector3(...CAR_CENTER)
  const surfacePoint = new THREE.Vector3(defect.x, defect.y, defect.z)
  const markerPoint = surfacePoint.clone().add(new THREE.Vector3(0, BEAM_HEIGHT, 0))

  const outward = surfacePoint.clone().sub(center)
  if (outward.lengthSq() < 1e-6) outward.set(1, 0, 0)
  outward.normalize()

  const camPos = markerPoint
    .clone()
    .addScaledVector(outward, CLOSEUP_OFFSET)
    .add(new THREE.Vector3(0, CLOSEUP_HOVER, 0))

  return (
    <div className="absolute bottom-4 right-4 z-30 overflow-hidden rounded-xl border-2 border-cyan-400/50 bg-[#050810] shadow-[0_0_20px_rgba(34,211,238,0.35)]">
      <div className="h-40 w-40">
        <Canvas
          key={defect.id}
          camera={{ position: camPos.toArray(), fov: 32 }}
          onCreated={(state) => {
            state.camera.lookAt(markerPoint)
          }}
        >
          <color attach="background" args={['#050810']} />
          <ambientLight intensity={0.6} color="#22d3ee" />
          <pointLight position={[2, 2, 2]} intensity={30} color="#67e8f9" />
          <CarModel />
          <DefectPin3D defect={defect} position={[defect.x, defect.y, defect.z]} dimmed={false} onClick={() => {}} />
        </Canvas>
      </div>
      <div className="bg-black/70 px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wide text-cyan-300">
        Close-up
      </div>
    </div>
  )
}
