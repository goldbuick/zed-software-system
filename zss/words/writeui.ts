import { tape_info } from 'zss/device/api'

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

export function fg(color: string, text: string) {
  return `$${color}${text}$blue`
}

export function bg(color: string, text: string) {
  return `$${color}${text}$ondkblue`
}

export function write(text: string) {
  tape_info('ui', text)
}

export function writetbar(width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  write(`${COLOR_EDGE}${CHR_TBAR}`)
}

export function writebbar(width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  write(`${COLOR_EDGE}${CHR_BBAR}`)
}

export function writeheader(header: string) {
  write(`${COLOR_EDGE} ${' '.repeat(header.length)} `)
  writetbar(header.length + 2)
  write(`${COLOR_EDGE} $white${header} `)
  writebbar(header.length + 2)
}

export function writesection(section: string) {
  write(`${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(`${COLOR_EDGE} $gray${section} `)
  writebbar(section.length + 2)
}

export function writeoption(option: string, label: string) {
  write(`${COLOR_EDGE} $white${option} $blue${label}`)
}

export function writetext(text: string) {
  write(`${COLOR_EDGE}$blue${text}`)
}

/**
 * what is writeui ?
 * this is a collection of helper function to write
 * interesting log lines to the terminal
 */
