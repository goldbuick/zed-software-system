import { useEffect, useRef, useState } from 'react'
import { BufferGeometry } from 'three'
import { RUNTIME } from 'zss/config'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'

import { createBlocksMaterial } from '../display/blocks'
import { useMedia } from '../hooks'

export function BlockMesh() {
  const palette = useMedia((state) => state.palettedata)
  const charset = useMedia((state) => state.charsetdata)
  const altcharset = useMedia((state) => state.altcharsetdata)
  const [material] = useState(() => createBlocksMaterial())

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()
  console.info(material)

  return (
    <>
      <boxGeometry args={[drawwidth, drawheight, drawheight]} />
      <primitive object={material} attach="material" />
    </>
  )
}
