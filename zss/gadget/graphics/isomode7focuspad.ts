/**
 * Extra inset from viewport edges for focus clamping in iso and mode7. Rotated / tilted
 * views need a tighter clamp than the axis-aligned flat model.
 */
const PAD_X = 0.75
const PAD_TOP = 0.5
const PAD_BOTTOM = 1.5

export function isomode7focuspad(drawwidth: number, drawheight: number) {
  return {
    padleft: drawwidth * PAD_X,
    padright: drawwidth * PAD_X,
    padtop: drawheight * PAD_TOP,
    padbottom: drawheight * PAD_BOTTOM,
  }
}
