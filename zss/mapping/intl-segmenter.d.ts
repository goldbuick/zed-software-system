/**
 * Intl.Segmenter is ES2022; project lib is ES2021.
 * Require modern env at runtime; this declaration allows compile.
 */
declare namespace Intl {
  type SegmenterOptions = {
    granularity?: 'grapheme' | 'word' | 'sentence'
  }
  type SegmentData = {
    segment: string
    index: number
    input: string
    isWordLike?: boolean
  }
  type Segments = {
    [Symbol.iterator](): IterableIterator<SegmentData>
  }
  class Segmenter {
    constructor(locales?: string | string[], options?: SegmenterOptions)
    segment(input: string): Segments
  }
}
