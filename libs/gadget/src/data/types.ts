/*

What is a gadget ??
* a yjs MAP of data
* a thing with width & height
* a collection of layers
* there are different kinds of layers
  * tilemap (xy coords that match width & height of gadget)
  * sprites (indivial outlined chars with xy coords with animated transitions)
  * gui (button, radio button, text input, code edit, with animated transitions)
  * media (sfxr, beepbox, youtube, tiktok, png, gif)

*/

export enum GADGET_LAYER {
  BLANK,
  TILES,
  SPRITES,
  GUI,
  MEDIA,
}
