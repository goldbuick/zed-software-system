import { ElemNode, el } from '@elemaudio/core'
import { clamp } from 'zss/mapping/number'

export function nm(key: string, alt: string): { key: string } {
  return { key: `${key}:${alt}` }
}

export function bpmtoseconds(tempo: number, subdiv = 16) {
  const beatlen = 1 / (tempo / 60)
  return (beatlen * 4) / subdiv
}

export function maybems(ms: number) {
  return Math.round((ms / 1000) * 44100)
}

export function fxecho(
  name: string,
  node: ElemNode,
  gain: number,
  delay: number,
) {
  const tapname = nm(name, 'tap').key
  const fx = el.sdelay(
    { ...nm(name, 'sdelay'), size: maybems(delay) },
    el.tapIn({ name: tapname }),
  )
  return el.tapOut({ name: tapname }, el.add(node, el.mul(gain, fx)))
}

export function fxreverb(
  name: string,
  node: ElemNode,
  gain: number,
  path: string,
) {
  const tapname = nm(name, 'tap').key
  const fx1 = el.sdelay(
    { ...nm(name, 'sdelay'), size: maybems(100) },
    el.tapIn({ name: tapname }),
  )
  const fx2 = el.convolve({ ...nm(name, 'convolve'), path }, fx1)
  return el.tapOut({ name: tapname }, el.add(node, el.mul(gain * 0.0347, fx2)))
}
