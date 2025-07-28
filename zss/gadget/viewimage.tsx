import { useLoader } from '@react-three/fiber'
import { Suspense } from 'react'
import { TextureLoader } from 'three'
import { RUNTIME } from 'zss/config'

import { ShadeBoxDither } from './graphics/dither'
import { useMedia } from './hooks'
import { UserFocus, UserInput } from './userinput'
import { useScreenSize } from './userscreen'

type TapeShowImage = {
  url: string
  drawwidth: number
  drawheight: number
}

function TapeShowImage({ url, drawwidth, drawheight }: TapeShowImage) {
  const texture = useLoader(TextureLoader, url)
  return (
    <mesh>
      <planeGeometry args={[drawwidth, -drawheight]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

export function TapeViewImage() {
  const screensize = useScreenSize()
  const { viewimage, setviewimage } = useMedia()

  // bail on odd states
  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }

  const rightedge = screensize.cols - 1
  const bottomedge = screensize.rows - 1
  const drawwidth = screensize.cols * RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = screensize.rows * RUNTIME.DRAW_CHAR_HEIGHT()
  return (
    viewimage && (
      <UserFocus>
        <UserInput CANCEL_BUTTON={() => setviewimage('')} />
        <group position={[0, 0, 998]}>
          <ShadeBoxDither
            alpha={0.4}
            width={screensize.cols}
            height={screensize.rows}
            top={0}
            left={0}
            right={rightedge}
            bottom={bottomedge}
          />
          <group position={[drawwidth * 0.5, drawheight * 0.5, 1]}>
            <Suspense fallback={null}>
              <TapeShowImage
                url={viewimage}
                drawwidth={drawwidth}
                drawheight={drawheight}
              />
            </Suspense>
          </group>
        </group>
      </UserFocus>
    )
  )
}
