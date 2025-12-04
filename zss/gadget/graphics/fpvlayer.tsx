import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { InstancedMesh } from 'three'
import { RUNTIME } from 'zss/config'
import { registerreadplayer } from 'zss/device/register'
import { useGadgetClient } from 'zss/gadget/data/state'
import { LAYER, LAYER_TYPE, layersreadcontrol } from 'zss/gadget/data/types'
import { indextopt } from 'zss/mapping/2d'
import { ispresent } from 'zss/mapping/types'
import { BOARD_SIZE, BOARD_WIDTH } from 'zss/memory/types'
import { COLLISION } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { BillboardMeshes } from './billboardmeshes'
import {
  DarknessMesh,
  filterlayer2floor,
  filterlayer2walls,
  filterlayer2water,
} from './blocks'
import { PillarwMeshes } from './pillarmeshes'
import { ShadowMeshes } from './shadowmeshes'
import { Tiles } from './tiles'

type GraphicsLayerProps = {
  id: string
  z: number
  from?: 'under' | 'over' | 'layers'
  layers?: LAYER[]
}

export function FPVLayer({ id, z, from, layers }: GraphicsLayerProps) {
  const player = registerreadplayer()
  const meshes4 = useRef<InstancedMesh>(null)

  useFrame(() => {
    if (ispresent(meshes4.current)) {
      meshes4.current.computeBoundingBox()
      meshes4.current.computeBoundingSphere()
    }
  })

  const layer = useGadgetClient(
    useShallow((state) => {
      if (ispresent(from)) {
        return state.gadget[from]?.find((item) => item.id === id)
      }
      if (ispresent(layers)) {
        return layers.find((item) => item.id === id)
      }
      return undefined
    }),
  )

  const drawwidth = RUNTIME.DRAW_CHAR_WIDTH()
  const drawheight = RUNTIME.DRAW_CHAR_HEIGHT()

  const control = layersreadcontrol(
    useGadgetClient.getState().gadget.layers ?? [],
  )

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
      const walls = filterlayer2walls(
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
            <group position-z={drawheight * -0.25}>
              <Tiles
                width={layer.width}
                height={layer.height}
                char={water.char}
                color={water.color}
                bg={water.bg}
              />
            </group>
            <PillarwMeshes
              width={BOARD_WIDTH}
              char={walls.char}
              color={walls.color}
              bg={walls.bg}
            />
          </group>
        </>
      )
    }
    case LAYER_TYPE.SPRITES: {
      const rr = 8 / 14
      const othersprites = layer.sprites.filter((sprite) => {
        switch (sprite.stat as COLLISION) {
          case COLLISION.ISSWIM:
          case COLLISION.ISBULLET:
            return false
          default:
            return sprite.pid !== player
        }
      })
      const bulletsprites = layer.sprites.filter(
        (sprite) => (sprite.stat as COLLISION) === COLLISION.ISBULLET,
      )
      const watersprites = layer.sprites.filter(
        (sprite) => (sprite.stat as COLLISION) === COLLISION.ISSWIM,
      )
      const shadowsprites = layer.sprites.filter((sprite) => {
        switch (sprite.stat as COLLISION) {
          case COLLISION.ISSWIM:
            return false
          default:
            return sprite.pid !== player
        }
      })
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <BillboardMeshes sprites={othersprites} facing={control.facing}>
            {(ix, iy) => [
              (ix + 0.5) * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -0.5,
            ]}
          </BillboardMeshes>
          <BillboardMeshes sprites={bulletsprites} facing={control.facing}>
            {(ix, iy) => [
              (ix + 0.5) * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -0.75,
            ]}
          </BillboardMeshes>
          <BillboardMeshes sprites={watersprites} facing={control.facing}>
            {(ix, iy) => [
              (ix + 0.5) * drawwidth,
              (iy + 0.5) * drawheight,
              drawheight * -1.25,
            ]}
          </BillboardMeshes>
          <ShadowMeshes sprites={shadowsprites} alpha={0.8}>
            {(ix, iy) => [
              ix * drawwidth,
              (iy + 0.5 - rr * 0.5) * drawheight,
              drawheight * -0.5 + 0.5,
            ]}
          </ShadowMeshes>
        </group>
      )
    }
    case LAYER_TYPE.DITHER: {
      return (
        // eslint-disable-next-line react/no-unknown-property
        <group key={layer.id} position={[0, 0, z]}>
          <Instances ref={meshes4} limit={BOARD_SIZE}>
            <DarknessMesh />
            {layer.alphas.map((alpha, idx) => {
              const pt = indextopt(idx, BOARD_WIDTH)
              return (
                <Instance
                  key={idx}
                  position={[
                    pt.x * drawwidth,
                    pt.y * drawheight,
                    drawheight * -0.5,
                  ]}
                  color={[alpha, 0, 0]}
                />
              )
            })}
          </Instances>
        </group>
      )
    }
  }
}
