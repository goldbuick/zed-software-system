import { useFrame } from '@react-three/fiber'
import { useMemo, useSyncExternalStore } from 'react'
import { VideoTexture } from 'three'
import { RUNTIME } from 'zss/config'
import { bridgemediastop } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  readmediainputvideo,
  subscribemediainputvideo,
} from 'zss/feature/broadcast/mediainput'

import { updateTexture } from './display/textures'
import { ShadeBoxDither } from './graphics/dither'
import { UserFocus } from './userinput'
import { UserInput } from './userinput.bridge'
import { useScreenSize } from './userscreen'

function TapeShowVideo({
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
  const withdrawwidth = vw * scale
  const withdrawheight = vh * scale

  return (
    <mesh>
      <planeGeometry args={[withdrawwidth, withdrawheight]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

export function TapeViewVideo() {
  const screensize = useScreenSize()
  const viewvideo = useSyncExternalStore(
    subscribemediainputvideo,
    readmediainputvideo,
    readmediainputvideo,
  )

  if (screensize.cols < 10 || screensize.rows < 10) {
    return null
  }
  if (!viewvideo) {
    return null
  }

  const rightedge = screensize.cols - 1
  const bottomedge = screensize.rows - 1
  const drawwidth = (screensize.cols - 4) * RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = (screensize.rows - 2) * RUNTIME.DRAW_CHAR_HEIGHT()
  const centerwidth = screensize.cols * RUNTIME.DRAW_CHAR_WIDTH() * 0.5
  const centerheight = screensize.rows * RUNTIME.DRAW_CHAR_HEIGHT() * 0.5

  return (
    <UserFocus>
      <UserInput
        CANCEL_BUTTON={() => {
          bridgemediastop(SOFTWARE, registerreadplayer())
        }}
      />
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
          <TapeShowVideo
            video={viewvideo}
            drawwidth={drawwidth}
            drawheight={drawheight}
          />
        </group>
      </group>
    </UserFocus>
  )
}
