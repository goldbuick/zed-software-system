import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { InstancedMesh } from 'three'
import { RUNTIME } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { indextopt } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION, COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import {
  BillboardMesh,
  BlockMesh,
  PillarMesh,
  ShadowMesh,
  filterlayer2floor,
  filterlayer2water,
} from './blocks'
import { Dither } from './dither'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from: 'under' | 'over' | 'layers'
}

export function FPVLayer({ id, z, from }: GraphicsLayerProps) {
  const player = registerreadplayer()
  const meshes = useRef<InstancedMesh>(null)
  const meshes2 = useRef<InstancedMesh>(null)
  const meshes3 = useRef<InstancedMesh>(null)

  useFrame(() => {
    if (ispresent(meshes.current)) {
      meshes.current.computeBoundingBox()
      meshes.current.computeBoundingSphere()
    }
    if (ispresent(meshes2.current)) {
      meshes2.current.computeBoundingBox()
      meshes2.current.computeBoundingSphere()
    }
    if (ispresent(meshes3.current)) {
      meshes3.current.computeBoundingBox()
      meshes3.current.computeBoundingSphere()
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
      const floor = filterlayer2floor(
        layer.char,
        layer.color,
        layer.bg,
        layer.stats,
      )
      const water = filterlayer2water(
        layer.char,
        layer.color,
        layer.bg,
        layer.stats,
      )
      // filter tiles
      return (
        <>
          <group key={layer.id} position={[0, 0, z]}>
            <Tiles
              width={layer.width}
              height={layer.height}
              char={floor.char}
              color={floor.color}
              bg={floor.bg}
            />
            <group position-z={drawheight * -0.5}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={water.char}
                color={water.color}
                bg={water.bg}
              />
            </group>
            <Instances ref={meshes2} limit={BOARD_SIZE}>
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
                            drawheight * 0.5,
                          ]}
                          scale={[0.9, 0.9, 0.9]}
                          color={[177, COLOR.DKGRAY, COLOR.BLACK]}
                        />
                      )
                  }
                  return null
                })
                .filter((el) => el)}
            </Instances>
            <Instances ref={meshes} limit={BOARD_SIZE}>
              <PillarMesh />
              {layer.stats
                .map((collision, idx) => {
                  const pt = indextopt(idx, BOARD_WIDTH)
                  switch (collision as COLLISION) {
                    case COLLISION.ISSOLID:
                      return (
                        <Instance
                          key={idx}
                          position={[pt.x * drawwidth, pt.y * drawheight, 0]}
                          color={[
                            layer.char[idx],
                            layer.color[idx],
                            layer.bg[idx],
                          ]}
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
      const rr = 8 / 14
      const othersprites = layer.sprites.filter(
        (sprite) => (sprite.stat as COLLISION) !== COLLISION.ISSWIM,
      )
      const watersprites = layer.sprites.filter(
        (sprite) => (sprite.stat as COLLISION) === COLLISION.ISSWIM,
      )
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Instances ref={meshes} limit={BOARD_SIZE}>
            <ShadowMesh />
            {layer.sprites.map((sprite, idx) => (
              <Instance
                key={idx}
                scale={[1, rr, 1]}
                position={[
                  sprite.x * drawwidth,
                  (sprite.y - rr + 0.5 + 0.25) * drawheight,
                  drawheight * -0.5 + 0.5,
                ]}
              />
            ))}
          </Instances>
          <Instances ref={meshes2} limit={BOARD_SIZE}>
            <BillboardMesh />
            {othersprites
              .filter((sprite) => sprite.pid !== player)
              .map((sprite, idx) => {
                return (
                  <Instance
                    key={idx}
                    position={[
                      sprite.x * drawwidth,
                      sprite.y * drawheight,
                      drawheight * -0.5,
                    ]}
                    color={[sprite.char, sprite.color, sprite.bg]}
                  />
                )
              })}
          </Instances>
          <Instances ref={meshes3} limit={BOARD_SIZE}>
            <BillboardMesh />
            {watersprites
              .filter((sprite) => sprite.pid !== player)
              .map((sprite, idx) => {
                return (
                  <Instance
                    key={idx}
                    position={[
                      sprite.x * drawwidth,
                      sprite.y * drawheight,
                      drawheight * -0.5,
                    ]}
                    color={[sprite.char, sprite.color, sprite.bg]}
                  />
                )
              })}
          </Instances>
          {/* <Sprites
            sprites={}
            withbillboards={true}
            fliptexture={false}
          />
          <group position-z={drawheight * -0.5}>
            <Sprites
              sprites={watersprites.filter((sprite) => sprite.pid !== player)}
              withbillboards={true}
              fliptexture={false}
            />
          </group> */}
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
