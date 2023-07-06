import { COLOR, Gadget, TILE_SIZE, data } from '@zss/gadget'
import { useLayoutEffect } from 'react'
import * as Y from 'yjs'

import useViewport from './useViewport'

const doc = new Y.Doc()
const test = data.createGadget({})

// add to document
const gadgets = doc.getMap('gadgets')
gadgets.set(test.id, test.gadget)

export function Terminal() {
  const { width, height } = useViewport()

  const cols = Math.floor(width / TILE_SIZE)
  const rows = Math.floor(height / TILE_SIZE)

  const xmargin = Math.round((width - cols * TILE_SIZE) * 0.5)
  const ymargin = Math.round((height - rows * TILE_SIZE) * 0.5)

  useLayoutEffect(() => {
    const tileTest = data.createTL({
      width: cols,
      height: rows,
      char: new Array(cols * rows).fill(219).map((c, i) => {
        const chart = i - cols * 5
        if (chart >= 0 && chart <= 255) {
          return chart
        }
        return c
      }),
      color: new Array(cols * rows).fill(COLOR.PURPLE),
      bg: new Array(cols * rows).fill(COLOR.BLACK),
    })
    data.addGL(test.gadget, tileTest.id, tileTest.layer)

    return () => {
      data.destroyGL(test.gadget, tileTest.id)
    }
  }, [cols, rows])

  return <Gadget gadget={test.gadget} position={[xmargin, ymargin, 0]} />
}

/*

terminal is a set of named slots for gadgets ... 
  and you create a gadget from a code page 
  
so how does layout work for the gadgets ?
how do we define these slots ?


cols ?
|--|---------|--|
rows ?
|--|
|  |
|--|
|  |
|  |
|  |
|--|
|  |
|--|

so it's like a stretchable 9x9 ?
And you can specfiy a gadget area from one to many cells

I think for v1 we can have a set of pre-canned layouts with pre-named slots
  for v2 we can create community suggested layouts
*/
