import { useBoardFade } from 'zss/gadget/fx/boardfade'
import { StaticDither } from 'zss/gadget/graphics/dither'
import { useScreenSize } from 'zss/gadget/userscreen'

/** Full-screen Bayer dither dissolve driven by `useBoardFade`. */
export function BoardFadeOverlay() {
  const alpha = useBoardFade((state) => state.alpha)
  const { cols, rows } = useScreenSize()

  if (alpha <= 0 || cols < 1 || rows < 1) {
    return null
  }

  return (
    <group position={[0, 0, 950]}>
      <StaticDither width={cols} height={rows} alpha={alpha} />
    </group>
  )
}
