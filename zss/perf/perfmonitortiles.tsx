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
  ivsBroadcastStatsPoll,
  readIvsBroadcastStatsSnapshot,
} from 'zss/perf/ivsbroadcaststats'
import { readjsonpipeapplyremotestats } from 'zss/perf/jsonpipeapplystats'
import { readPeerWireTotals } from 'zss/perf/peerwire'
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
import { COLOR } from 'zss/words/types'

const PERF_PLATE_BG = COLOR.DKPURPLE
const PERF_FRAME_FG = COLOR.PURPLE

const PANEL_W = 38
const PANEL_H = 16
const REFRESH_MS = 320
/** Rolling window for peer byte volume (past minute). */
const PEER_VOLUME_WINDOW_MS = 60_000

type PeerWireSnapshot = {
  t: number
  sent: number
  recv: number
}

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
}

type PeerPeak = {
  peakup: number
  peakdn: number
}

function PerfMonitorDraw({ glRef }: PerfMonitorDrawProps) {
  const context = useWriteText()
  const peerPrev = useRef({ sent: 0, recv: 0, t: 0 })
  const peerPeak = useRef<PeerPeak>({
    peakup: 0,
    peakdn: 0,
  })
  const peerWireHistory = useRef<PeerWireSnapshot[]>([])
  const chatPrev = useRef({ total: 0, t: 0 })
  const jsonpipePrev = useRef({ total: 0, t: 0 })

  useEffect(() => {
    const tick = () => {
      ivsBroadcastStatsPoll()
      const W = PANEL_W
      const H = PANEL_H
      const BG = PERF_PLATE_BG
      const edge = textformatreadedges(context)

      for (let y = edge.top; y <= edge.bottom; ++y) {
        for (let x = edge.left; x <= edge.right; ++x) {
          const char =
            (x + y) % 2 === 0
              ? Math.abs(Math.round(Math.cos(x * y * 0.01)))
                ? BKG_PTRN
                : BKG_PTRN_ALT
              : 0
          writetile(context, W, H, x, y, {
            char,
            color: PERF_FRAME_FG,
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
      writetile(context, W, H, 0, 0, { char: TL, color: PERF_FRAME_FG, bg: BG })
      writetile(context, W, H, W - 1, 0, {
        char: TR,
        color: PERF_FRAME_FG,
        bg: BG,
      })
      writetile(context, W, H, 0, H - 1, {
        char: BL,
        color: PERF_FRAME_FG,
        bg: BG,
      })
      writetile(context, W, H, W - 1, H - 1, {
        char: BR,
        color: PERF_FRAME_FG,
        bg: BG,
      })
      for (let x = 1; x < W - 1; ++x) {
        writetile(context, W, H, x, 0, {
          char: HZ,
          color: PERF_FRAME_FG,
          bg: BG,
        })
        writetile(context, W, H, x, H - 1, {
          char: HZ,
          color: PERF_FRAME_FG,
          bg: BG,
        })
      }
      for (let y = 1; y < H - 1; ++y) {
        writetile(context, W, H, 0, y, {
          char: VT,
          color: PERF_FRAME_FG,
          bg: BG,
        })
        writetile(context, W, H, W - 1, y, {
          char: VT,
          color: PERF_FRAME_FG,
          bg: BG,
        })
      }

      let row = 0
      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(`$PURPLE PERF$WHITE monitor`, context, true)

      const gl = glRef.current
      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(`$yellow fps=$white${gl.fps}`, context, true)

      const now = performance.now()
      const peer = readPeerWireTotals()
      let upRate = 0
      let dnRate = 0
      const pt = peerPrev.current
      const pk = peerPeak.current
      if (pt.t > 0) {
        const dt = (now - pt.t) / 1000
        if (dt > 0.04) {
          upRate = (peer.sent - pt.sent) / dt
          dnRate = (peer.recv - pt.recv) / dt
          pk.peakup = Math.max(pk.peakup, upRate)
          pk.peakdn = Math.max(pk.peakdn, dnRate)
        }
      }
      peerPrev.current = { sent: peer.sent, recv: peer.recv, t: now }

      const hist = peerWireHistory.current
      const lastsnap = hist.length > 0 ? hist[hist.length - 1] : undefined
      if (
        lastsnap !== undefined &&
        (peer.sent < lastsnap.sent || peer.recv < lastsnap.recv)
      ) {
        hist.length = 0
      }
      hist.push({ t: now, sent: peer.sent, recv: peer.recv })
      const cutoff = now - PEER_VOLUME_WINDOW_MS
      while (hist.length > 1 && hist[0].t < cutoff) {
        hist.shift()
      }
      const baseline = hist[0]
      const up1m = Math.max(0, peer.sent - baseline.sent)
      const dn1m = Math.max(0, peer.recv - baseline.recv)

      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$yellow peer up $green$24 $white${fmtRate(upRate)}$yellow ($white${fmtTotal(peer.sent)}$yellow)`,
        context,
        true,
      )
      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `  $yellowpk $white${fmtRate(pk.peakup)} $yellow1m $white${fmtTotal(up1m)}`,
        context,
        true,
      )

      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$yellow peer down $green$25 $white${fmtRate(dnRate)}$yellow ($white${fmtTotal(peer.recv)}$yellow)`,
        context,
        true,
      )
      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `  $yellowpk $white${fmtRate(pk.peakdn)} $yellow1m $white${fmtTotal(dn1m)}`,
        context,
        true,
      )

      const ivs = readIvsBroadcastStatsSnapshot()
      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
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
          `$yellow broadcast $white${ivs.connectionState}${
            kbps ? `$yellow ${kbps}` : ''
          }${fps ? `$yellow ${fps}` : ''}${
            encDim ? `$yellow ${encDim}` : ''
          }${canvasDim ? `$yellow ${canvasDim}` : ''}${
            ivs.sessionId ? `$yellow ${ivs.sessionId.slice(0, 6)}` : ''
          }${pkt ? `$yellow ${pkt}` : ''}`,
          context,
          true,
        )
      } else {
        tokenizeandwritetextformat(
          `$yellow broadcast $blackidle`,
          context,
          true,
        )
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

      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$yellow chat $white${msgRate.toFixed(1)}/s$yellow tot=$white${chat.total}`,
        context,
        true,
      )
      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `  $yellowtw=$white${chat.byKind[CHAT_KIND.TWITCH]} $yellowrss=$white${chat.byKind[CHAT_KIND.RSS]} $yellowmas=$white${chat.byKind[CHAT_KIND.MASTODON]} $yellowbsky=$white${chat.byKind[CHAT_KIND.BLUESKY]}`,
        context,
        true,
      )

      const jsonpipe = readjsonpipeapplyremotestats()
      let jsonpipeRate = 0
      const jt = jsonpipePrev.current
      if (jt.t > 0) {
        const dt = (now - jt.t) / 1000
        if (dt > 0.04) {
          jsonpipeRate = (jsonpipe.total - jt.total) / dt
        }
      }
      jsonpipePrev.current = { total: jsonpipe.total, t: now }

      setupeditoritem(false, false, 0, row++, context, 1, 1, 1)
      tokenizeandwritetextformat(
        `$yellow jsonpipe ops $white${jsonpipeRate.toFixed(1)}/s$yellow total=$white${jsonpipe.total}`,
        context,
        true,
      )
    }

    const id = window.setInterval(tick, REFRESH_MS)
    tick()
    return () => window.clearInterval(id)
  }, [context, glRef])

  return null
}

export function PerfMonitorTiles() {
  const perfmonitor = useTape((s) => s.perfmonitor)
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
        quickterminal={false}
        top={0}
        left={0}
        width={PANEL_W}
        height={PANEL_H}
        framefg={PERF_FRAME_FG}
        platebg={PERF_PLATE_BG}
      >
        <PerfGlCapture snapRef={glRef} />
        <PerfMonitorDraw glRef={glRef} />
      </TapeLayoutTiles>
    </group>
  )
}
