import { range } from '@zss/system/mapping/array'
import { useMemo } from 'react'

import { CharSet } from './display/charSet'
import defaultCharSetUrl from './img/charset.png'
import usePaddedTexture from './img/usePaddedTexture'

/*

What is a gadget ??
* a yjs MAP of data
* a thing with width & height
* a collection of layers
* there are different kinds of layers
  * tilemap (xy coords that match width & height of gadget)
  * objects (indivial outlined chars with xy coords with animated transitions)
  * input elements (button, radio button, text input, code edit, with animated transitions)

*/

export function Gadget() {
  const map = usePaddedTexture(defaultCharSetUrl)

  const chars = useMemo(
    () => range(16 * 16).map((code) => ({ code, color: 1 + (code % 16) })),
    [],
  )

  return (
    <CharSet
      map={map}
      alt={map}
      width={16}
      height={16}
      chars={chars}
      outline
      position={[0, 0, 10]}
    />
  )
}
