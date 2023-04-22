import { range } from '@zss/system/mapping/array'
import { randomInteger } from '@zss/system/mapping/number'
import { useRenderOnChange } from '@zss/yjs/binding'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import * as Y from 'yjs'

import { useClipping } from '../clipping'
import { createGadget, createGL } from '../data/gadget'
import defaultCharSetUrl from '../img/charset.png'
import { COLOR, threeColors } from '../img/colors'
import {
  createTilemapBufferGeometry,
  createTilemapDataTexture,
  writeTilemapDataTexture,
} from '../img/tilemap'
import useTexture from '../img/useTexture'
import { GADGET_LAYER } from '../types'

import { CharSet } from './charSet'

/*

What is a gadget ??
* a yjs MAP of data
* a thing with width & height
* a collection of layers
* there are different kinds of layers
  * tilemap (xy coords that match width & height of gadget)
  * objects (indivial outlined chars with xy coords with animated transitions)
  * input elements (button, radio button, text input, code edit, with animated transitions)

For the input elements, the point IS for them to manipulate the state of the Y.Map
even for buttons being pressed etc, a text input etc ..

*/

const doc = new Y.Doc()

const gadget = createGadget(doc, {})

const charsWidth = 2048
const charsHeight = 1024

export function Gadget() {
  useRenderOnChange(gadget)

  const [chars, setChars] = useState(() =>
    range(charsWidth * charsHeight).map((code) => ({
      code: 33 + (code % 200),
      color: 1 + (code % 15),
    })),
  )

  useEffect(() => {
    const testLayer = createGL(gadget, GADGET_LAYER.TILES, {
      width: 16,
      height: 16,
    })
  }, [])

  useEffect(() => {
    function doot() {
      // setChars((state) => {
      //   for (let i = 0; i < 100000; ++i) {
      //     const x = randomInteger(0, charsWidth - 1)
      //     const y = randomInteger(0, charsHeight - 1)
      //     const c = x + y * charsWidth
      //     state[c].code = randomInteger(0, 255)
      //     state[c].color = randomInteger(1, COLOR.MAX - 1)
      //   }
      //   return state.slice()
      // })
    }

    const timer = setInterval(doot, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [])

  const map = useTexture(defaultCharSetUrl)

  return (
    <CharSet
      map={map}
      alt={map}
      chars={chars}
      width={charsWidth}
      height={charsHeight}
    />
  )
}
