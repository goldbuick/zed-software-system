import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { initaudio } from 'zss/gadget/audio/blaster'
import {
  TileSnapshot,
  resetTiles,
  useTiles,
} from 'zss/gadget/components/usetiles'
import {
  WRITE_TEXT_CONTEXT,
  createwritetextcontext,
  tokenizeandwritetextformat,
} from 'zss/gadget/data/textformat'
import { COLOR, DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'

const RELEASE = `${import.meta.env.ZSS_BRANCH_NAME} - ${import.meta.env.ZSS_BRANCH_VERSION} - ${import.meta.env.ZSS_COMMIT_MESSAGE}`

export type SplashProps = {
  onBoot: () => void
}

export function Splash({ onBoot }: SplashProps) {
  const viewport = useThree((state) => state.viewport)
  const { width: viewWidth, height: viewHeight } = viewport.getCurrentViewport()

  const width = Math.floor(viewWidth / DRAW_CHAR_WIDTH)
  const height = Math.floor(viewHeight / DRAW_CHAR_HEIGHT)
  const marginX = viewWidth - width * DRAW_CHAR_WIDTH
  const marginY = viewHeight - height * DRAW_CHAR_HEIGHT

  const tiles = useTiles(width, height, 0, 0, 0)

  const gerber = Math.max(1, Math.min(width - 2, RELEASE.length))
  const TICKER: string[] = [
    `${import.meta.env.ZSS_BRANCH_NAME} - ${import.meta.env.ZSS_BRANCH_VERSION} - ${import.meta.env.ZSS_COMMIT_MESSAGE}\n`,
    `${'-'.repeat(gerber)}\n`,
    `PRESS ANY KEY`,
  ]

  useEffect(() => {
    async function boot() {
      await initaudio()
      onBoot()
    }
    function invoke() {
      void boot()
    }

    document.addEventListener('keydown', invoke)
    document.addEventListener('pointerdown', invoke)
    return () => {
      document.removeEventListener('keydown', invoke)
      document.removeEventListener('pointerdown', invoke)
    }
  }, [onBoot])

  useEffect(() => {
    resetTiles(tiles, 0, COLOR.WHITE, COLOR.DKGRAY)
    const context: WRITE_TEXT_CONTEXT = {
      ...createwritetextcontext(
        width,
        height,
        COLOR.WHITE,
        COLOR.DKGRAY,
        1,
        1,
        width - 2,
        height - 1,
      ),
      ...tiles,
      x: 1,
      y: 1,
    }
    TICKER.forEach((item) => tokenizeandwritetextformat(item, context, true))
  }, [width, height, tiles, TICKER])

  return (
    <group position={[marginX * 0.5, marginY * 0.5, 0]}>
      <TileSnapshot width={width} height={height} tiles={tiles} />
    </group>
  )
}
