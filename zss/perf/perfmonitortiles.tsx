import { useFrame, useThree } from '@react-three/fiber'
import { type MutableRefObject, useEffect, useRef } from 'react'
import { PERF_UI, RUNTIME } from 'zss/config'
import { CHAT_KIND } from 'zss/device/bridge/chattypes'
import { useTape } from 'zss/gadget/data/zustandstores'
import { writetile } from 'zss/gadget/tiles'
import { useScreenSize } from 'zss/gadget/userscreen'
import { useWriteText } from 'zss/gadget/writetext'
import { readChatMessageStats } from 'zss/perf/chatmessagestats'
import {
  kickIvsBroadcastStatsPoll,
  readIvsBroadcastStatsSnapshot,
} from 'zss/perf/ivsbroadcaststats'
import { readPeerWireTotals } from 'zss/perf/peerwire'
import { FG, bgcolor } from 'zss/screens/tape/colors'
import {
  BKG_PTRN,
  BKG_PTRN_ALT,
  setupeditoritem,
} from 'zss/screens/tape/common'
import { TapeLayoutTiles } from 'zss/screens/tape/layouttiles'
import {
  textformatreadedges,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

const PANEL_W = 38
const PANEL_H = 14
const REFRESH_MS = 320

type GlSnap = {
  fps: number
  calls: number
  triangles: number
  lines: number
  points: number
  geometries: number
  textures: number
  programs: number
}

function defaultGlSnap(): GlSnap {
  return {
    fps: 0,
    calls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
  }
}

function fmtRate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec < 0) {
    return '0B/s'
  }
  if (bytesPerSec < 1024) {
    return `${bytesPerSec.toFixed(0)}B/s`
  }
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)}K/s`
  }
  return `${(bytesPerSec / 1024 / 1024).toFixed(2)}M/s`
}

function fmtTotal(n: number): string {
  if (n < 1024) {
    return `${n}B`
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)}K`
  }
  return `${(n / 1024 / 1024).toFixed(2)}M`
}

function PerfGlCapture({ snapRef }: { snapRef: MutableRefObject<GlSnap> }) {
  const gl = useThree((s) => s.gl)
  const smoothFps = useRef(0)

  useEffect(() => {
    if (gl?.info) {
      gl.info.autoReset = true
    }
  }, [gl])

  useFrame((_, dt) => {
    const instant = 1 / Math.max(dt, 1e-6)
    smoothFps.current = smoothFps.current * 0.92 + instant * 0.08
    const info = gl.info
    const r = info.render
    const m = info.memory
    snapRef.current = {
      fps: Math.round(smoothFps.current),
      calls: r.calls,
      triangles: r.triangles,
      lines: r.lines,
      points: r.points,
      geometries: m.geometries,
      textures: m.textures,
      programs: info.programs?.length ?? 0,
    }
  })
  return null
}

type PerfMonitorDrawProps = {
  glRef: MutableRefObject<GlSnap>
  quickterminal: boolean
}

function PerfMonitorDraw({ glRef, quickterminal }: PerfMonitorDrawProps) {
  const context = useWriteText()
  const peerPrev = useRef({ sent: 0, recv: 0, t: 0 })
  const chatPrev = useRef({ total: 0, t: 0 })

  useEffect(() => {
    const tick = () => {
      kickIvsBroadcastStatsPoll()
      const W = PANEL_W
      const H = PANEL_H
      const BG = bgcolor(quickterminal)
      const edge = textformatreadedges(context)

      for (let y = edge.top; y <= edge.bottom; ++y) {
        for (let x = edge.left; x <= edge.right; ++x) {
          let char = 0
          if (!quickterminal) {
            char =
              (x + y) % 2 === 0
                ? Math.abs(Math.round(Math.cos(x * y * 0.01)))
                  ? BKG_PTRN
                  : BKG_PTRN_ALT
                : 0
          }
          writetile(context, W, H, x, y, {
            char,
            color: FG,
            bg: BG,
          })
        }
      }

      const TL = 218
      const TR = 191
      const BL = 192
      const BR = 217
      const HZ = 196
      const VT = 179
      writetile(context, W, H, 0, 0, { char: TL, color: FG, bg: BG })
      writetile(context, W, H, W - 1, 0, { char: TR, color: FG, bg: BG })
      writetile(context, W, H, 0, H - 1, { char: BL, color: FG, bg: BG })
      writetile(context, W, H, W - 1, H - 1, { char: BR, color: FG, bg: BG })
      for (let x = 1; x < W - 1; ++x) {
        writetile(context, W, H, x, 0, { char: HZ, color: FG, bg: BG })
        writetile(context, W, H, x, H - 1, { char: HZ, color: FG, bg: BG })
      }
      for (let y = 1; y < H - 1; ++y) {
        writetile(context, W, H, 0, y, { char: VT, color: FG, bg: BG })
        writetile(context, W, H, W - 1, y, { char: VT, color: FG, bg: BG })
      }

      setupeditoritem(false, false, 0, 0, context, 1, 1, 1)
      tokenizeandwritetextformat(`$CYAN PERF$WHITE monitor`, context, true)

      const gl = glRef.current
      setupeditoritem(false, false, 0, 1, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$gray fps=$white${gl.fps} $gray c=$white${gl.calls} $gray tri=$white${gl.triangles} $gray geo=$white${gl.geometries}`,
        context,
        true,
      )

      const now = performance.now()
      const peer = readPeerWireTotals()
      let upRate = 0
      let dnRate = 0
      const pt = peerPrev.current
      if (pt.t > 0) {
        const dt = (now - pt.t) / 1000
        if (dt > 0.04) {
          upRate = (peer.sent - pt.sent) / dt
          dnRate = (peer.recv - pt.recv) / dt
        }
      }
      peerPrev.current = { sent: peer.sent, recv: peer.recv, t: now }

      setupeditoritem(false, false, 0, 2, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$gray peer $green↑$white${fmtRate(upRate)}$gray ($white${fmtTotal(peer.sent)}$gray) $green↓$white${fmtRate(dnRate)}$gray ($white${fmtTotal(peer.recv)}$gray)`,
        context,
        true,
      )

      const ivs = readIvsBroadcastStatsSnapshot()
      setupeditoritem(false, false, 0, 3, context, 1, 1, 1)
      if (ivs) {
        const canvasDim =
          ivs.canvasW != null && ivs.canvasH != null
            ? `cv${ivs.canvasW}x${ivs.canvasH}`
            : ''
        const encDim =
          ivs.frameW != null && ivs.frameH != null
            ? `enc${ivs.frameW}x${ivs.frameH}`
            : ''
        const kbps =
          ivs.videoKbps != null && Number.isFinite(ivs.videoKbps)
            ? `${ivs.videoKbps.toFixed(0)}kbps`
            : ''
        const fps =
          ivs.fps != null && Number.isFinite(ivs.fps)
            ? `${ivs.fps.toFixed(0)}fps`
            : ''
        const pkt = ivs.packetsLost != null ? `lost=${ivs.packetsLost}` : ''
        tokenizeandwritetextformat(
          `$gray ivs $white${ivs.connectionState}${
            kbps ? `$gray ${kbps}` : ''
          }${fps ? `$gray ${fps}` : ''}${
            encDim ? `$gray ${encDim}` : ''
          }${canvasDim ? `$gray ${canvasDim}` : ''}${
            ivs.sessionId ? `$gray ${ivs.sessionId.slice(0, 6)}` : ''
          }${pkt ? `$gray ${pkt}` : ''}`,
          context,
          true,
        )
      } else {
        tokenizeandwritetextformat(`$gray ivs $DKGRAYidle`, context, true)
      }

      const chat = readChatMessageStats()
      let msgRate = 0
      const ct = chatPrev.current
      if (ct.t > 0) {
        const dt = (now - ct.t) / 1000
        if (dt > 0.04) {
          msgRate = (chat.total - ct.total) / dt
        }
      }
      chatPrev.current = { total: chat.total, t: now }

      setupeditoritem(false, false, 0, 4, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$gray chat $white${msgRate.toFixed(1)}/s$gray tot=$white${chat.total} $gray tw=${chat.byKind[CHAT_KIND.TWITCH]} rss=${chat.byKind[CHAT_KIND.RSS]} mas=${chat.byKind[CHAT_KIND.MASTODON]} bs=${chat.byKind[CHAT_KIND.BLUESKY]}`,
        context,
        true,
      )

      setupeditoritem(false, false, 0, 5, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$gray ln=$white${gl.lines} $gray pt=$white${gl.points} $gray tex=$white${gl.textures} $gray prg=$white${gl.programs}`,
        context,
        true,
      )
    }

    const id = window.setInterval(tick, REFRESH_MS)
    tick()
    return () => window.clearInterval(id)
  }, [context, quickterminal, glRef])

  return null
}

export function PerfMonitorTiles() {
  const [perfmonitor, quickterminal] = useTape(
    useShallow((s) => [s.perfmonitor, s.quickterminal]),
  )
  const screensize = useScreenSize()
  const glRef = useRef<GlSnap>(defaultGlSnap())

  if (!perfmonitor && !PERF_UI) {
    return null
  }

  if (screensize.cols < PANEL_W + 4 || screensize.rows < PANEL_H + 4) {
    return null
  }

  return (
    <group
      position={[
        screensize.marginx + RUNTIME.DRAW_CHAR_WIDTH(),
        screensize.marginy + RUNTIME.DRAW_CHAR_HEIGHT(),
        640,
      ]}
    >
      <TapeLayoutTiles
        label="perfmon"
        quickterminal={quickterminal}
        top={0}
        left={0}
        width={PANEL_W}
        height={PANEL_H}
      >
        <PerfGlCapture snapRef={glRef} />
        <PerfMonitorDraw glRef={glRef} quickterminal={quickterminal} />
      </TapeLayoutTiles>
    </group>
  )
}
