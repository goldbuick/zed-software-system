import { ElemNode, el } from '@elemaudio/core'
import { clamp } from 'zss/mapping/number'

export function bpmtoseconds(tempo: number, subdiv = 16) {
  const beatlen = 1 / (tempo / 60)
  return (beatlen * 4) / subdiv
}
