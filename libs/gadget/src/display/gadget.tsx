import { range } from '@zss/system/mapping/array'
import { useRenderOnChange } from '@zss/yjs/binding'
import { useEffect, useMemo } from 'react'
import * as Y from 'yjs'

import { createGadget, createGL } from '../data/gadget'
import defaultCharSetUrl from '../img/charset.png'
import usePaddedTexture from '../img/usePaddedTexture'
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

export function Gadget() {
  useRenderOnChange(gadget)

  useEffect(() => {
    const testLayer = createGL(gadget, GADGET_LAYER.TILES, {
      width: 16,
      height: 16,
    })
  }, [])

  console.info('did render!')

  return null
}

/*
  // // we want to render whenever gadget layers change
  // // because each component will manage it's immediate state

  // const map = usePaddedTexture(defaultCharSetUrl)

  // const chars = useMemo(
  //   () => range(16 * 16).map((code) => ({ code, color: 1 + (code % 16) })),
  //   [],
  // )

  // return (
  //   <CharSet
  //     map={map}
  //     alt={map}
  //     width={16}
  //     height={16}
  //     chars={chars}
  //     outline
  //     position={[0, 0, 10]}
  //   />
  // )

*/
