export function nm(key: string, alt: string): { key: string } {
  return { key: `${key}:${alt}` }
}

export function bpmtoseconds(tempo: number, subdiv = 16) {
  const beatlen = 1 / (tempo / 60)
  return (beatlen * 4) / subdiv
}
