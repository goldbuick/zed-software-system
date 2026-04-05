/**
 * Pure zsstext line builders for terminal (`write`) and scroll (`gadgettext`).
 * Layout constants and bar/header/section/option strings live here only.
 */

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

export const DIVIDER = '$yellow$205$205$205$196'
export const DOWN_SPOUT = '$196$191'
export const UP_SPOUT = '$192$196'

export function zsstbarline(width: number): string {
  return `${COLOR_EDGE}${CHR_TM.repeat(width)}`
}

export function zssbbarline(width: number): string {
  return `${COLOR_EDGE}${CHR_BM.repeat(width)}`
}

export function zssheaderlines(header: string): string[] {
  const width = header.length + 2
  return [
    zsstbarline(width),
    `${COLOR_EDGE} $white${header} `,
    zssbbarline(width),
  ]
}

export function zsssectionlines(section: string): string[] {
  const width = section.length + 2
  return [
    `${COLOR_EDGE} ${' '.repeat(section.length)} `,
    `${COLOR_EDGE} $gray${section} `,
    zssbbarline(width),
  ]
}

export function zssoptionline(option: string, label: string): string {
  return `${COLOR_EDGE} $white${option} $blue${label}`
}

export function zsstextline(text: string): string {
  return `${COLOR_EDGE}$blue${text}`
}
