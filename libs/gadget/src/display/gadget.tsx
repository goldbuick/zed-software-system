import { select } from '@zss/system/mapping/array'
import { randomInteger } from '@zss/system/mapping/number'
import { useObservable } from '@zss/yjs/binding'
import { setMapGridValue } from '@zss/yjs/mapping'
import React, { useLayoutEffect, useState } from 'react'
import * as Y from 'yjs'

import { createDL, writeDL } from '../data/dither'
import { createGadget, getGLids, getGLs, getGL, addGL } from '../data/gadget'
import { getLType, GADGET_LAYER } from '../data/layer'
import {
  createSL,
  getSLSprite,
  getSLSpriteIds,
  setSLSpriteBg,
  setSLSpriteColor,
  setSLSpriteXY,
} from '../data/sprites'
import { createTL, writeTL } from '../data/tiles'
import { COLOR } from '../img/colors'

import { Dither } from './dither'
import { Gui } from './gui'
import { Sprites } from './sprites'
import { Tiles } from './tiles'

/*

What is a gadget ??
* a yjs MAP of data
* a thing with width & height
* a collection of layers
* there are different kinds of layers
  * tilemap (xy coords that match width & height of gadget)
  * objects (indivial outlined chars with xy coords with animated transitions) 
    * (going to try and use point sprite material for this)
  * input elements (button, radio button, text input, code edit, with animated transitions)

For the input elements, the point IS for them to manipulate the state of the Y.Map
even for buttons being pressed etc, a text input etc ..

*/

const doc = new Y.Doc()
const gadget = createGadget(doc, {})

const TEST_RATE = 16
const TEST_WIDTH = 60
const TEST_HEIGHT = 40

const TEST_RATE_2 = 1
const TEST_SPRITES = 128

const fade = [32, 176, 177, 178, 219]

export function Gadget() {
  // test code begin
  useLayoutEffect(() => {
    // create test layers
    const tileTest = createTL({
      width: TEST_WIDTH,
      height: TEST_HEIGHT,
      char: new Array(TEST_WIDTH * TEST_HEIGHT).fill(219).map((c, i) => {
        const chart = i - TEST_WIDTH * 5
        if (chart >= 0 && chart <= 255) {
          return chart
        }
        return c
      }),
      color: new Array(TEST_WIDTH * TEST_HEIGHT).fill(COLOR.PURPLE),
      bg: new Array(TEST_WIDTH * TEST_HEIGHT).fill(COLOR.BLACK),
    })
    addGL(gadget, tileTest.id, tileTest.layer)

    const spriteTest = createSL({
      sprites: new Array(TEST_SPRITES).fill(0).map((v, i) => ({
        x: randomInteger(0, TEST_WIDTH - 1),
        y: randomInteger(0, TEST_HEIGHT - 1),
        char: randomInteger(1, 15),
        color: COLOR.GREEN,
        bg: COLOR.MAGENTA,
      })),
    })
    addGL(gadget, spriteTest.id, spriteTest.layer)

    const ditherTest = createDL({
      width: TEST_WIDTH,
      height: TEST_HEIGHT,
      alpha: new Array(TEST_WIDTH * TEST_HEIGHT).fill(0),
    })
    addGL(gadget, ditherTest.id, ditherTest.layer)

    let offset = 0
    const ds = 0.01
    const os = 0.0005
    const timer = setInterval(() => {
      const phase = Math.round(1 + Math.abs(Math.sin(offset * 0.001) * 14))

      // writeTL(tileTest.layer, ({ width, height, color, char, bg }) => {
      //   for (let i = 0; i < TEST_RATE; ++i) {
      //     const x = randomInteger(0, width - 1)
      //     const y = randomInteger(0, height - 1)
      //     const slider = Math.cos(x * ds + y * 0.25 * ds + offset * os)
      //     setMapGridValue(
      //       char,
      //       width,
      //       x,
      //       y,
      //       fade[Math.abs(Math.round(slider * (fade.length - 1)))],
      //     )
      //     if (randomInteger(0, 50) < 25) {
      //       setMapGridValue(color, width, x, y, phase + 16)
      //     } else {
      //       setMapGridValue(bg, width, x, y, COLOR.MAX - phase)
      //     }
      //   }
      // })

      const ids = getSLSpriteIds(spriteTest.layer)
      spriteTest.layer.doc?.transact(function () {
        for (let i = 0; i < TEST_RATE_2; ++i) {
          const id = select(ids)
          const sprite = getSLSprite(spriteTest.layer, id)
          const x = sprite?.get('x') ?? 0
          const y = sprite?.get('y') ?? 0
          setSLSpriteXY(
            sprite,
            randomInteger(Math.max(0, x - 1), Math.min(TEST_WIDTH - 1, x + 1)),
            randomInteger(Math.max(0, y - 1), Math.min(TEST_HEIGHT - 1, y + 1)),
          )
          setSLSpriteColor(sprite, phase)
          setSLSpriteBg(sprite, 16 - phase)
        }
      })

      if (offset % 15 === 0) {
        writeDL(ditherTest.layer, ({ width, height, alpha }) => {
          const alphas = [
            0.8, 0.75, 0.65, 0.55, 0.5, 0.45, 0.4, 0.3, 0.2, 0.2, 0.1, 0.1, 0.0,
            0.0, 0.0,
          ]
          const scale = 0.125
          const slide = 0.003
          const range = alphas.length - 1

          if (alpha) {
            alpha.toArray().forEach((v, i) => {
              const x = i % TEST_WIDTH
              const y = Math.floor(i / TEST_WIDTH)
              const dx = x - TEST_WIDTH * 0.5
              const dy = y - TEST_HEIGHT * 0.5
              const dist = Math.sqrt(dx * dx + dy * dy)
              const phase = Math.round(
                Math.abs(Math.sin(dist * scale + offset * slide)) * range,
              )
              setMapGridValue(alpha, width, x, y, alphas[phase] ?? 0)
            })
          }
        })
      }

      ++offset
    }, Math.round(1000 / 15))
    return () => clearInterval(timer)
  }, [])
  // test code end

  const [layerIds, setLayerIds] = useState<string[]>([])

  useObservable(getGLs(gadget), () => setLayerIds(getGLids(gadget)))

  return (
    <>
      {layerIds.map((id, index) => {
        const layer = getGL(gadget, id)
        return (
          <group key={id} position-z={index}>
            {(() => {
              switch (getLType(layer)) {
                case GADGET_LAYER.GUI:
                  return <Gui id={id} layer={layer} />
                case GADGET_LAYER.TILES:
                  return <Tiles id={id} layer={layer} />
                case GADGET_LAYER.SPRITES:
                  return <Sprites id={id} layer={layer} />
                case GADGET_LAYER.DITHER:
                  return <Dither id={id} layer={layer} />
                default:
                case GADGET_LAYER.BLANK:
                  return <React.Fragment key={id} />
              }
            })()}
          </group>
        )
      })}
    </>
  )
}
