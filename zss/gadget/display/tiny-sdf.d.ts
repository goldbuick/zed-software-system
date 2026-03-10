declare module '@mapbox/tiny-sdf' {
  type TinySDFOptions = {
    fontSize?: number
    buffer?: number
    radius?: number
    cutoff?: number
    fontFamily?: string
    fontWeight?: string
    fontStyle?: string
    lang?: string | null
  }
  type Glyph = {
    data: Uint8ClampedArray
    width: number
    height: number
    glyphWidth: number
    glyphHeight: number
    glyphTop: number
    glyphLeft: number
    glyphAdvance: number
  }
  class TinySDF {
    constructor(options?: TinySDFOptions)
    draw(char: string): Glyph
  }
  export default TinySDF
}
