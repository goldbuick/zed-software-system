import { Compressor } from 'tone'

export const maincompressor = new Compressor({
  threshold: -20,
  ratio: 12,
  attack: 0,
  release: 0.3,
})
maincompressor.toDestination()
