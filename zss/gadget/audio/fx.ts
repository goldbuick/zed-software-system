import {
  Chorus,
  Distortion,
  FeedbackDelay,
  Phaser,
  Reverb,
  Vibrato,
} from 'tone'

export function createfx() {
  const reverb = new Reverb()
  reverb.set({
    wet: 0,
  })

  const echo = new FeedbackDelay()
  echo.set({
    wet: 0,
    delayTime: '4n.',
    maxDelay: '1n',
    feedback: 0.371,
  })

  const chorus = new Chorus()
  chorus.set({
    wet: 0,
    depth: 0.999,
    frequency: 7,
    feedback: 0.666,
  })

  const phaser = new Phaser()
  phaser.set({
    wet: 0,
    Q: 10,
  })

  const distortion = new Distortion()
  distortion.set({
    wet: 0,
    distortion: 0.9,
  })

  const vibrato = new Vibrato()
  vibrato.set({
    wet: 0,
    depth: 0.2,
  })

  return {
    reverb,
    echo,
    chorus,
    phaser,
    distortion,
    vibrato,
  }
}
