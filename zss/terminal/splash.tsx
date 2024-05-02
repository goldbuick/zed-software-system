import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { initaudio } from 'zss/gadget/audio/blaster'
import {
  TileSnapshot,
  resetTiles,
  useTiles,
  writeTile,
} from 'zss/gadget/components/usetiles'
import { DRAW_CHAR_HEIGHT, DRAW_CHAR_WIDTH } from 'zss/gadget/data/types'

const TINFO = `${import.meta.env.ZSS_BRANCH_NAME} - ${import.meta.env.ZSS_BRANCH_VERSION} - ${import.meta.env.ZSS_COMMIT_MESSAGE}`
const TSPACE = `        `
const TICKER = `${TSPACE}< Click To Boot >${TSPACE}${TINFO}`

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
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    async function boot() {
      await initaudio()
      onBoot()
    }
    function invoke() {
      void boot()
    }

    document.addEventListener('pointerdown', invoke)
    return () => {
      document.removeEventListener('pointerdown', invoke)
    }
  }, [onBoot])

  useEffect(() => {
    const timer = setInterval(
      () => setOffset((state) => state + TICKER.length - 1),
      250,
    )
    return () => {
      clearInterval(timer)
    }
  }, [setOffset])

  useEffect(() => {
    resetTiles(tiles, 0, 0, 0)

    for (let iy = 0; iy < height; ++iy) {
      for (let ix = 0; ix < width; ++ix) {
        writeTile(tiles, width, height, ix, iy, {
          char:
            iy % 2 === 1
              ? 0
              : TICKER.charCodeAt((ix + iy + offset) % TICKER.length),
          color: 15,
        })
      }
    }

    //
  }, [width, height, tiles, offset])

  return (
    <group position={[marginX * 0.5, marginY * 0.5, 0]}>
      <TileSnapshot width={width} height={height} tiles={tiles} />
    </group>
  )
}
