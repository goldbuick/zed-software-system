import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import { ptstoarea } from 'zss/mapping/2d'
import { PT } from 'zss/words/types'

import { codepagereadname } from './codepage'
import { memoryloadermatches } from './loader'
import { CODE_PAGE_TYPE } from './types'

import { memorypickcodepagewithtype } from '.'

export function gadgetinspectloaders(player: string, p1: PT, p2: PT) {
  // add matching loaders
  const loaders = memoryloadermatches('text', 'gadget:action')
  if (loaders.length) {
    gadgettext(player, 'gadget actions:')
  }

  const area = ptstoarea(p1, p2)
  for (let i = 0; i < loaders.length; ++i) {
    const codepage = loaders[i]
    const name = codepagereadname(codepage)
    gadgethyperlink(player, 'gadget', `run ${name}`, [
      'action',
      '',
      codepage.id,
      area,
    ])
  }
}

export function gadgetinspectboard(player: string, board: string) {
  const boardcodepage = memorypickcodepagewithtype(CODE_PAGE_TYPE.BOARD, board)
  gadgettext(player, `board ${codepagereadname(boardcodepage)}:`)
  gadgethyperlink(player, 'batch', `board id ${board}`, ['copyit', board])
  gadgethyperlink(player, 'batch', `edit board codepage`, [`pageopen:${board}`])
}
