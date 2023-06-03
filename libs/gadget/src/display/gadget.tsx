import { randomInteger } from '@zss/system/mapping/number'
import { useObservable } from '@zss/yjs/binding'
import React, { useLayoutEffect, useState } from 'react'
import * as Y from 'yjs'

import { createGadget, getGLids, getGLs, getGL, addGL } from '../data/gadget'
import {
  createSL,
  createTL,
  getLType,
  setTLChar,
  setTLColor,
  writeTL,
} from '../data/layer'
import { GADGET_LAYER } from '../data/types'
import { COLOR } from '../img/colors'

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

const TEST_RATE = 100
const TEST_WIDTH = 50
const TEST_HEIGHT = 30

export function Gadget() {
  // test code begin
  useLayoutEffect(() => {
    // create test layers
    const tileTest = createTL({
      width: TEST_WIDTH,
      height: TEST_HEIGHT,
      chars: new Array(TEST_WIDTH * TEST_HEIGHT).fill(1),
      colors: new Array(TEST_WIDTH * TEST_HEIGHT).fill(COLOR.RED),
    })
    addGL(gadget, tileTest.id, tileTest.layer)

    const spriteTest = createSL({
      sprites: new Array(128).fill(0).map((v, i) => ({
        x: randomInteger(0, TEST_WIDTH - 1),
        y: randomInteger(0, TEST_HEIGHT - 1),
        char: randomInteger(1, 15),
        color: COLOR.MAGENTA,
      })),
    })
    addGL(gadget, spriteTest.id, spriteTest.layer)

    // getGLs(gadget)?.set(test.id, test.layer)

    const ds = 0.01
    const os = 0.005
    // let writes = 0
    let offset = 0
    const timer = setInterval(() => {
      writeTL(tileTest.layer, ({ width, height, colors, chars }) => {
        for (let i = 0; i < TEST_RATE; ++i) {
          const x = randomInteger(0, width - 1)
          const y = randomInteger(0, height - 1)
          setTLColor(
            colors,
            width,
            height,
            x,
            y,
            randomInteger(1, COLOR.MAX - 1),
          )
          setTLChar(
            chars,
            width,
            height,
            x,
            y,
            1 +
              Math.round(Math.cos(x * ds + y * 0.25 * ds + offset * os) * 253),
          )
          // writes += 2
        }
      })
      ++offset
      // console.log(writes)
    }, 70)
    return () => clearInterval(timer)
  }, [])
  // test code end

  const [layerIds, setLayerIds] = useState<string[]>([])

  useObservable(getGLs(gadget), () => {
    setLayerIds(getGLids(gadget))
  })

  return (
    <>
      {layerIds.map((id) => {
        const layer = getGL(gadget, id)
        switch (getLType(layer)) {
          case GADGET_LAYER.GUI:
            return <Gui key={id} id={id} layer={layer} />
          case GADGET_LAYER.TILES:
            return <Tiles key={id} id={id} layer={layer} />
          case GADGET_LAYER.SPRITES:
            return <Sprites key={id} id={id} layer={layer} />
          default:
          case GADGET_LAYER.BLANK:
            return <React.Fragment key={id} />
        }
      })}
    </>
  )
}
