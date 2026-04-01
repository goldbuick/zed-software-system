import { ReactNode } from 'react'
import { RUNTIME } from 'zss/config'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

type ExitPreviewCachedTintProps = {
  showcachedtint: boolean
  children: ReactNode
}

/** Slight cool overlay when the neighbor preview is a cached snapshot (visited). */
export function ExitPreviewCachedTint({
  showcachedtint,
  children,
}: ExitPreviewCachedTintProps) {
  const dw = RUNTIME.DRAW_CHAR_WIDTH()
  const dh = RUNTIME.DRAW_CHAR_HEIGHT()
  const w = BOARD_WIDTH * dw
  const h = BOARD_HEIGHT * dh
  return (
    <group>
      {children}
      {showcachedtint ? (
        // eslint-disable-next-line react/no-unknown-property
        <mesh position={[w * 0.5, -h * 0.5, 6]} renderOrder={2000}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            color="#aac8ff"
            transparent
            opacity={0.1}
            // eslint-disable-next-line react/no-unknown-property
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  )
}
