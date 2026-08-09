import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, VideoTexture } from 'three'
import { encode } from 'uqr'
import { RUNTIME } from 'zss/config'
import {
  registerairsharestop,
  registerairsharestream,
  vmbooks,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { airsharebytestobase64url } from 'zss/feature/airshare/bytes'
import { airsharereadqrbytes } from 'zss/feature/airshare/decode'
import { airshareclearfocus } from 'zss/feature/airshare/focus'
import {
  type AIRSHARE_DECODER,
  airshareingestframe,
  airsharerecoverpayload,
  createairsharedecoder,
  createairshareencoder,
  encodeairshareframe,
} from 'zss/feature/airshare/fountain'
import { sha256bytes, sha256equal } from 'zss/feature/airshare/hash'
import {
  airsharestreamidentity,
  parseairshareframe,
} from 'zss/feature/airshare/protocol'
import {
  AIRSHARE_DEFAULT_TX_FPS,
  airshareblocksizeforversion,
} from 'zss/feature/airshare/qrcapacity'
import {
  airsharedrawqr,
  airshareencodemodulematrix,
} from 'zss/feature/airshare/qrrender'
import { airsharereset, useAirshare } from 'zss/feature/airshare/state'
import { updateTexture } from 'zss/gadget/display/textures'
import { ShadeBoxDither } from 'zss/gadget/graphics/dither'
import { useTiles } from 'zss/gadget/tiles'
import { UserFocus } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { useScreenSize } from 'zss/gadget/userscreen'
import { TilesData, TilesRender } from 'zss/gadget/usetiles'
import { WriteTextContext } from 'zss/gadget/writetext'
import { ToggleKey } from 'zss/screens/touchui/togglekey'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

function stopairshare() {
  registerairsharestop(SOFTWARE, registerreadplayer())
}

function transmitairshare() {
  registerairsharestream(SOFTWARE, registerreadplayer())
}

function AirshareChrome({
  cols,
  rows,
  showok,
  statusline,
}: {
  cols: number
  rows: number
  showok: boolean
  statusline: string
}) {
  const store = useTiles(cols, rows, 32, COLOR.WHITE, COLOR.ONCLEAR)
  const context: WRITE_TEXT_CONTEXT = {
    ...createwritetextcontext(cols, rows, COLOR.WHITE, COLOR.ONCLEAR),
    ...store.getState(),
  }
  const keyy = Math.max(0, rows - 4)
  const escx = 1
  const okx = 7

  if (statusline) {
    context.x = 1
    context.y = Math.max(0, keyy - 2)
    tokenizeandwritetextformat(
      statusline.slice(0, Math.max(8, cols - 2)),
      context,
      false,
    )
  }

  return (
    <TilesData store={store}>
      <WriteTextContext.Provider value={context}>
        <ToggleKey x={escx} y={keyy} letters="esc" onToggle={stopairshare} />
        {showok && (
          <ToggleKey
            x={okx}
            y={keyy}
            letters="ok"
            onToggle={transmitairshare}
          />
        )}
      </WriteTextContext.Provider>
      <TilesRender label="airshare" width={cols} height={rows} />
    </TilesData>
  )
}

function AirshareQrPlane({
  canvas,
  drawwidth,
  drawheight,
}: {
  canvas: HTMLCanvasElement
  drawwidth: number
  drawheight: number
}) {
  const texture = useMemo(() => {
    const tex = new CanvasTexture(canvas)
    return updateTexture(tex)
  }, [canvas])

  useFrame(() => {
    texture.needsUpdate = true
  })

  const imagewidth = Math.max(1, canvas.width)
  const imageheight = Math.max(1, canvas.height)
  const scale = Math.min(drawwidth / imagewidth, drawheight / imageheight)
  const w = imagewidth * scale
  const h = imageheight * scale

  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

function AirshareVideoPlane({
  video,
  drawwidth,
  drawheight,
}: {
  video: HTMLVideoElement
  drawwidth: number
  drawheight: number
}) {
  const texture = useMemo(() => {
    const tex = new VideoTexture(video)
    return updateTexture(tex)
  }, [video])

  useFrame(() => {
    texture.needsUpdate = true
  })

  const vw = Math.max(1, video.videoWidth || 640)
  const vh = Math.max(1, video.videoHeight || 480)
  const scale = Math.min(drawwidth / vw, drawheight / vh)
  const w = vw * scale
  const h = vh * scale

  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

function useInviteQr(inviteurl: string) {
  const canvas = useMemo(() => document.createElement('canvas'), [])
  useEffect(() => {
    if (!inviteurl) {
      return
    }
    const result = encode(inviteurl, { ecc: 'M', border: 2 })
    airsharedrawqr(canvas, result.data, 6)
  }, [canvas, inviteurl])
  return canvas
}

function useStreamQr(payload: Uint8Array | null) {
  const canvas = useMemo(() => document.createElement('canvas'), [])
  useEffect(() => {
    if (!payload) {
      return
    }
    let cancelled = false
    let seq = 0
    let timer = 0
    const session = (Math.random() * 0xffffffff) >>> 0
    const blocksize = airshareblocksizeforversion()
    const interval = Math.max(16, Math.floor(1000 / AIRSHARE_DEFAULT_TX_FPS))

    void (async () => {
      const sha = await sha256bytes(payload)
      if (cancelled) {
        return
      }
      const encoder = createairshareencoder(payload, blocksize, session, sha)
      useAirshare.setState({
        blockcount: encoder.blockcount,
        status: `streaming ${payload.length} bytes - ${encoder.blockcount} blocks`,
      })
      const tick = () => {
        if (cancelled) {
          return
        }
        const frame = encodeairshareframe(encoder, seq)
        const matrix = airshareencodemodulematrix(frame)
        airsharedrawqr(canvas, matrix.data, 3)
        useAirshare.setState({ progress: seq })
        seq += 1
        timer = window.setTimeout(tick, interval) as unknown as number
      }
      tick()
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [canvas, payload])
  return canvas
}

function useReceiveVideo(enabled: boolean) {
  const video = useMemo(() => {
    const el = document.createElement('video')
    el.muted = true
    el.playsInline = true
    el.setAttribute('playsinline', 'true')
    return el
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }
    let cancelled = false
    let mediastream: MediaStream | null = null
    let raf = 0
    let decoder: AIRSHARE_DECODER | null = null
    let lastscan = 0
    const sample = document.createElement('canvas')
    const ctx = sample.getContext('2d', { willReadFrequently: true })

    async function finish(payload: Uint8Array) {
      const hash = await sha256bytes(payload)
      if (!decoder || !sha256equal(hash, decoder.sha256)) {
        useAirshare.setState({
          error: 'hash mismatch after peel',
          status: '',
        })
        return
      }
      const compressed = airsharebytestobase64url(payload)
      useAirshare.setState({
        status: `received ${payload.length} bytes - applying MEMORY`,
      })
      vmbooks(SOFTWARE, registerreadplayer(), compressed)
      airsharereset()
    }

    async function loop(now: number) {
      if (cancelled) {
        return
      }
      raf = requestAnimationFrame((t) => {
        void loop(t)
      })
      if (!ctx || video.readyState < 2) {
        return
      }
      if (now - lastscan < 50) {
        return
      }
      lastscan = now
      const w = video.videoWidth
      const h = video.videoHeight
      if (w < 8 || h < 8) {
        return
      }
      sample.width = w
      sample.height = h
      ctx.drawImage(video, 0, 0, w, h)
      const imagedata = ctx.getImageData(0, 0, w, h)
      let frames: Uint8Array[] = []
      try {
        frames = await airsharereadqrbytes(imagedata)
      } catch {
        return
      }
      for (let i = 0; i < frames.length; ++i) {
        const parsed = parseairshareframe(frames[i])
        if (!parsed) {
          continue
        }
        const identity = airsharestreamidentity(parsed.header)
        if (decoder?.identity !== identity) {
          decoder = createairsharedecoder(parsed.header, identity)
          useAirshare.setState({
            blockcount: parsed.header.blockcount,
            progress: 0,
            status: 'locked onto stream',
            error: '',
          })
        }
        const result = airshareingestframe(decoder, frames[i])
        if (result.ok) {
          useAirshare.setState({
            progress: decoder.seen.size,
            status: `frames ${decoder.seen.size} - blocks ${decoder.solved}/${decoder.blockcount}`,
          })
        }
        if (result.complete) {
          const payload = airsharerecoverpayload(decoder)
          if (payload) {
            cancelled = true
            cancelAnimationFrame(raf)
            await finish(payload)
            return
          }
        }
      }
    }

    void (async () => {
      try {
        mediastream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (cancelled) {
          mediastream.getTracks().forEach((t) => t.stop())
          return
        }
        video.srcObject = mediastream
        await video.play()
        raf = requestAnimationFrame((t) => {
          void loop(t)
        })
      } catch (err) {
        useAirshare.setState({
          error: err instanceof Error ? err.message : 'camera failed',
          status: '',
        })
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (mediastream) {
        mediastream.getTracks().forEach((t) => t.stop())
      }
      video.srcObject = null
    }
  }, [enabled, video])

  return video
}

export function AirshareView() {
  const screensize = useScreenSize()
  const mode = useAirshare((s) => s.mode)
  const inviteurl = useAirshare((s) => s.inviteurl)
  const payload = useAirshare((s) => s.payload)
  const status = useAirshare((s) => s.status)
  const error = useAirshare((s) => s.error)
  const progress = useAirshare((s) => s.progress)
  const blockcount = useAirshare((s) => s.blockcount)

  const invitecanvas = useInviteQr(mode === 'invite' ? inviteurl : '')
  const streamcanvas = useStreamQr(mode === 'stream' ? payload : null)
  const receivevideo = useReceiveVideo(mode === 'receive')

  useEffect(() => {
    if (mode === 'off') {
      return
    }
    airshareclearfocus(SOFTWARE, registerreadplayer())
  }, [mode])

  if (mode === 'off' || screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const rightedge = screensize.cols - 1
  const bottomedge = screensize.rows - 1
  const drawwidth = (screensize.cols - 4) * RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = (screensize.rows - 5) * RUNTIME.DRAW_CHAR_HEIGHT()
  const centerwidth = screensize.cols * RUNTIME.DRAW_CHAR_WIDTH() * 0.5
  const centerheight = screensize.rows * RUNTIME.DRAW_CHAR_HEIGHT() * 0.4

  const statusline =
    error || status || (blockcount > 0 ? `frame ${progress}` : '')

  return (
    <UserFocus>
      <UserInput
        OK_BUTTON={mode === 'invite' ? transmitairshare : undefined}
        CANCEL_BUTTON={stopairshare}
      />
      <group position={[0, 0, 998]}>
        <ShadeBoxDither
          alpha={0.55}
          width={screensize.cols}
          height={screensize.rows}
          top={0}
          left={0}
          right={rightedge}
          bottom={bottomedge}
        />
        <group
          position={[centerwidth, centerheight, 1]}
          scale-x={-1}
          rotation-z={Math.PI}
        >
          {mode === 'invite' && (
            <AirshareQrPlane
              canvas={invitecanvas}
              drawwidth={drawwidth}
              drawheight={drawheight}
            />
          )}
          {mode === 'stream' && (
            <AirshareQrPlane
              canvas={streamcanvas}
              drawwidth={drawwidth}
              drawheight={drawheight}
            />
          )}
          {mode === 'receive' && (
            <AirshareVideoPlane
              video={receivevideo}
              drawwidth={drawwidth}
              drawheight={drawheight}
            />
          )}
        </group>
        <AirshareChrome
          cols={screensize.cols}
          rows={screensize.rows}
          showok={mode === 'invite'}
          statusline={statusline}
        />
      </group>
    </UserFocus>
  )
}
