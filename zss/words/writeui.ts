import { tape_info } from 'zss/device/api'

/**
 * what is writeui ?
 * this is a collection of helper function to write
 * interesting log lines to the terminal
 */

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

export function fg(color: string, text: string) {
  return `$${color}${text}$blue`
}

export function bg(color: string, text: string) {
  return `$${color}${text}$ondkblue`
}

export function write(from: string, text: string) {
  tape_info(from, text)
}

export function writetbar(from: string, width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  write(from, `${COLOR_EDGE}${CHR_TBAR}`)
}

export function writebbar(from: string, width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  write(from, `${COLOR_EDGE}${CHR_BBAR}`)
}

export function writeheader(from: string, header: string) {
  write(from, `${COLOR_EDGE} ${' '.repeat(header.length)} `)
  writetbar(from, header.length + 2)
  write(from, `${COLOR_EDGE} $white${header} `)
  writebbar(from, header.length + 2)
}

export function writesection(from: string, section: string) {
  write(from, `${COLOR_EDGE} ${' '.repeat(section.length)} `)
  write(from, `${COLOR_EDGE} $gray${section} `)
  writebbar(from, section.length + 2)
}

export function writeoption(from: string, option: string, label: string) {
  write(from, `${COLOR_EDGE} $white${option} $blue${label}`)
}

export function writetext(from: string, text: string) {
  write(from, `${COLOR_EDGE}$blue${text}`)
}
