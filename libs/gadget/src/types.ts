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

import { COLOR } from './img/colors'

export type CHAR = {
  color?: COLOR
  code?: number
}

export type CHARS = (CHAR | undefined | null)[]

export enum GADGET_LAYER {
  BLANK,
  TILES,
  SPRITES,
  GUI,
}
