import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { InstancedMesh } from 'three'
import { RUNTIME } from 'zss/config'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { indextopt } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION, COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { BlockMesh } from './blocks'
import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from: 'under' | 'over' | 'layers'
}

export function IsoLayer({ id, z, from }: GraphicsLayerProps) {
  const meshes = useRef<InstancedMesh>(null)

  useFrame(() => {
    if (ispresent(meshes.current)) {
      meshes.current.computeBoundingBox()
      meshes.current.computeBoundingSphere()
    }
  })

  const layer = useGadgetClient(
    useShallow((state) => state.gadget[from]?.find((item) => item.id === id)),
  )

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()

  switch (layer?.type) {
    default:
    case LAYER_TYPE.BLANK:
    case LAYER_TYPE.MEDIA:
      return null
    case LAYER_TYPE.TILES: {
      const chars = layer.char.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSWIM:
          case COLLISION.ISSOLID:
            return 0
        }
        return v
      })
      const colors = layer.color.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSWIM:
          case COLLISION.ISSOLID:
            return COLOR.ONCLEAR
        }
        return v
      })
      const bgs = layer.bg.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSWIM:
          case COLLISION.ISSOLID:
            return COLOR.ONCLEAR
        }
        return v
      })
      const wallchars = layer.char.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSOLID:
            return v
        }
        return 0
      })
      const wallcolors = layer.color.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSOLID:
            return v
        }
        return 0
      })
      const wallbgs = layer.bg.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSOLID:
            return v
        }
        return COLOR.ONCLEAR
      })
      const waterchars = layer.char.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSWIM:
            return v
          case COLLISION.ISSOLID:
            return 0
        }
        return 176
      })
      const watercolors = layer.color.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSWIM:
            return v
          case COLLISION.ISSOLID:
            return COLOR.ONCLEAR
        }
        return COLOR.DKGRAY
      })
      const waterbgs = layer.bg.map((v, idx) => {
        switch (layer.stats[idx] as COLLISION) {
          case COLLISION.ISSWIM:
            return v
          case COLLISION.ISSOLID:
            return COLOR.ONCLEAR
        }
        return COLOR.BLACK
      })
      return (
        <>
          <group key={layer.id} position={[0, 0, z]}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={chars}
              color={colors}
              bg={bgs}
            />
            <group position-z={drawheight * -0.5}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={waterchars}
                color={watercolors}
                bg={waterbgs}
              />
            </group>
            <group position-z={drawheight * 1}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={wallchars}
                color={wallcolors}
                bg={wallbgs}
              />
            </group>
            <Instances ref={meshes}>
              <BlockMesh />
              {layer.stats
                .map((collision, idx) => {
                  const pt = indextopt(idx, BOARD_WIDTH)
                  switch (collision as COLLISION) {
                    case COLLISION.ISSOLID:
                      return (
                        <Instance
                          key={idx}
                          position={[
                            (pt.x + 0.5) * drawwidth,
                            (pt.y + 0.5) * drawheight,
                            drawheight * 0.5 - 1,
                          ]}
                          color={[177, COLOR.DKGRAY, COLOR.BLACK]}
                        />
                      )
                  }
                  return null
                })
                .filter((el) => el)}
            </Instances>
          </group>
        </>
      )
    }
    case LAYER_TYPE.SPRITES: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Sprites sprites={[...layer.sprites]} fliptexture={false} />
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Dither
            width={layer.width}
            height={layer.height}
            alphas={[...layer.alphas]}
          />
        </group>
      )
    }
  }
}
