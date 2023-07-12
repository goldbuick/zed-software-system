import { Gadget, TILE_SIZE, data } from '@zss/gadget'
import { useEffect } from 'react'
import * as Y from 'yjs'

import { createWorkspace, loadWorkspace } from './data'
import useViewport from './useViewport'

const doc = new Y.Doc()
const test = data.createGadget({})

// add to document
const gadgets = doc.getMap('gadgets')
gadgets.set(test.id, test.gadget)

// should we construct a default software bundle and pass it to Terminal ?

async function workspaceTesting() {
  const workspace = createWorkspace('zed-cafe@0')
  await loadWorkspace(workspace)
}

export function Terminal() {
  const { width, height } = useViewport()

  const cols = Math.floor(width / TILE_SIZE)
  const rows = Math.floor(height / TILE_SIZE)

  const xmargin = Math.round((width - cols * TILE_SIZE) * 0.5)
  const ymargin = Math.round((height - rows * TILE_SIZE) * 0.5)

  console.info({ cols, rows, xmargin, ymargin })

  useEffect(() => {
    workspaceTesting()
  }, [])

  return <Gadget gadget={test.gadget} position={[xmargin, ymargin, 0]} />
}

/*

we have 3 pillars of content here ?

step 1: plain old object format (storing & describing software)

step 2: runtime format (running software)

step 3: yjs format (modifying software)

we do not have software running software, but it would be interesting to explore mods ?

basically when you play a game you've made, you run the bundle(s)

and why not have a default bundle, and when creating a new project

pick a source bundle ??


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

ACTUALLY THE LAYOUT engine is progressive loading

#gadget start
#gadget left 100 "codepage"
#gadget main "codepage"

this creates a two column layout with main taking up the remaining area

so we load the "boot" codepage connected to the terminal api
  and it's the boot codepage's job to select a gadget layout
  and load the layout's slots with code pages

bundles of code pages

rpg.bot


what do we need to run a terminal ?

a software bundle, which is a collection of codepages

what is a software bundle?

can we load multiple softare bundles?
  yes, use @bundle.codepage to address it



boot program comes from local storage,
  however zed.cafe should provide a default boot program


*/
