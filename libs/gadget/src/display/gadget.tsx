import { useRenderOnChange } from '@zss/yjs/binding'
import React, { useLayoutEffect } from 'react'
import * as Y from 'yjs'

import { createGadget, getGLids, getGLs, getGL } from '../data/gadget'
import { createTL, getLType } from '../data/layer'
import { GADGET_LAYER } from '../types'

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

export function Gadget() {
  useRenderOnChange(gadget)

  useLayoutEffect(() => {
    const testLayer = createTL(getGLs(gadget), {
      width: 16,
      height: 16,
      chars: new Array(16 * 16).fill(1),
      colors: new Array(16 * 16).fill(1),
    })
  }, [])

  // const map = useTexture(defaultCharSetUrl)

  const layerIds = getGLids(gadget)
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
