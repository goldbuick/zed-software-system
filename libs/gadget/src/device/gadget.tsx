import { useObservable } from '@zss/yjs/binding'
import { MAYBE_MAP } from '@zss/yjs/types'
import { useState } from 'react'

import { getGLids, getGLs, getGL } from '../data/gadget'
import { getLType, GADGET_LAYER } from '../data/layer'

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

interface GadgetProps {
  gadget: MAYBE_MAP
  z?: number
}

export function Gadget({ gadget, z = 0 }: GadgetProps) {
  const [layerIds, setLayerIds] = useState<string[]>([])

  useObservable(getGLs(gadget), () => {
    setLayerIds(getGLids(gadget))
  })

  return (
    <group position-z={z}>
      {layerIds.map((id, index) => {
        const layer = getGL(gadget, id)
        return (
          <group key={id} position-z={index * 8}>
            {(() => {
              switch (getLType(layer)) {
                case GADGET_LAYER.GUI:
                  return <Gui layer={layer} />
                case GADGET_LAYER.TILES:
                  return <Tiles layer={layer} />
                case GADGET_LAYER.SPRITES:
                  return <Sprites layer={layer} />
                case GADGET_LAYER.DITHER:
                  return <Dither layer={layer} />
                default:
                case GADGET_LAYER.BLANK:
                  return null
              }
            })()}
          </group>
        )
      })}
    </group>
  )
}
