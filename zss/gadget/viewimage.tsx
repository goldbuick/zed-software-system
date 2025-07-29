import { useLoader } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { TextureLoader } from 'three'
import { RUNTIME } from 'zss/config'

import { updateTexture } from './display/textures'
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

  useEffect(() => {
    texture.flipY = true
    updateTexture(texture)
  }, [texture])

  const { width: imagewidth = 1, height: imageheight = 1 } =
    texture?.image ?? {}
  const scale = Math.min(drawwidth / imagewidth, drawheight / imageheight)
  const withdrawwidth = imagewidth * scale
  const withdrawheight = imageheight * scale

  return (
    <mesh>
      <planeGeometry args={[withdrawwidth, withdrawheight]} />
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
  const drawwidth = (screensize.cols - 4) * RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = (screensize.rows - 2) * RUNTIME.DRAW_CHAR_HEIGHT()
  const centerwidth = screensize.cols * RUNTIME.DRAW_CHAR_WIDTH() * 0.5
  const centerheight = screensize.rows * RUNTIME.DRAW_CHAR_HEIGHT() * 0.5
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
          <group
            position={[centerwidth, centerheight, 1]}
            scale-x={-1}
            rotation-z={Math.PI}
          >
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
