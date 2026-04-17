import { StatsGl } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PERF_UI } from 'zss/config'

const LOG_INTERVAL_S = 1

function PerfHudInner() {
  const gl = useThree((state) => state.gl)
  const acc = useRef(0)
  const lastrender = useRef(0)

  useEffect(() => {
    if (gl?.info) {
      gl.info.autoReset = true
    }
  }, [gl])

  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current < LOG_INTERVAL_S) {
      return
    }
    acc.current = 0
    const info = gl?.info
    if (!info) {
      return
    }
    const r = info.render
    const m = info.memory
    const p = info.programs?.length ?? 0
    const delta_calls = r.calls - lastrender.current
    lastrender.current = r.calls

    // eslint-disable-next-line no-console -- intentional perf logging when ZSS_DEBUG_PERF_UI is on
    console.log(
      `[zss perf] calls=${r.calls} (+${delta_calls}/s) tris=${r.triangles} lines=${r.lines} pts=${r.points} geos=${m.geometries} texs=${m.textures} programs=${p}`,
    )
  })

  return <StatsGl horizontal={false} trackGPU={true} />
}

/** PERF_UI-gated perf HUD: stats-gl overlay + periodic renderer.info log. */
export function PerfHud() {
  if (!PERF_UI) {
    return null
  }
  return <PerfHudInner />
}
