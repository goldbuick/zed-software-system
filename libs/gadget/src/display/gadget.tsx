import { range } from '@zss/system/mapping/array'
import { useMemo } from 'react'
import * as Y from 'yjs'

import { useRenderOnChange } from '../data/binding'
import defaultCharSetUrl from '../img/charset.png'
import usePaddedTexture from '../img/usePaddedTexture'

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

interface GadgetProps {
  gadget: Y.Map<any>
}

export function Gadget({ gadget }: GadgetProps) {
  useRenderOnChange(gadget)

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
