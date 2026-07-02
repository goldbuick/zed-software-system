import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { useTape } from 'zss/gadget/data/zustandstores'

const LOG_INTERVAL_S = 1

/** Perf-monitor console logging of GPU resource footprint (no StatsGl / stats-gl UI). */
function PerfHudConsoleLogger() {
  const gl = useThree((state) => state.gl)
  const acc = useRef(0)

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
    const m = info.memory
    const p = info.programs?.length ?? 0

    // eslint-disable-next-line no-console -- intentional perf logging when perf monitor is on
    console.log(
      `[zss perf] geos=${m.geometries} texs=${m.textures} programs=${p}`,
    )
  })

  return null
}

export function PerfHud() {
  const perfmonitor = useTape((s) => s.perfmonitor)
  if (!perfmonitor) {
    return null
  }
  return <PerfHudConsoleLogger />
}
