import { COPYIT_NOTE_TRANSPOSE_SENTINEL } from 'zss/memory/notecopyscroll'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { isnumber, isstring } from 'zss/mapping/types'
import { WORD } from 'zss/words/types'

const NOTETRANSPOSE_TARGET = 'notetranspose'

let notetransposebuffer = ''

function get(name: string) {
  if (name === NOTETRANSPOSE_TARGET) {
    return notetransposebuffer
  }
  return ''
}

function set(name: string, value: WORD) {
  if (name === NOTETRANSPOSE_TARGET && (isstring(value) || isnumber(value))) {
    notetransposebuffer = `${value}`
  }
}

export function memorynotestransposescroll(player: string) {
  gadgettext(player, '$ltgrey type pitch names - space-separated a-g # !')
  gadgettext(player, '$ltgrey then pick half or whole step copy')
  gadgethyperlink(
    player,
    'list',
    '$whitenotes to transpose',
    [NOTETRANSPOSE_TARGET, 'text'],
    get,
    set,
  )
  gadgettext(player, '')
  gadgethyperlink(player, 'list', '$greencopy -2 (whole step down)', [
    'copyit',
    COPYIT_NOTE_TRANSPOSE_SENTINEL,
    NOTETRANSPOSE_TARGET,
    '-2',
  ])
  gadgethyperlink(player, 'list', '$greencopy -1 (half step down)', [
    'copyit',
    COPYIT_NOTE_TRANSPOSE_SENTINEL,
    NOTETRANSPOSE_TARGET,
    '-1',
  ])
  gadgethyperlink(player, 'list', '$greencopy +1 (half step up)', [
    'copyit',
    COPYIT_NOTE_TRANSPOSE_SENTINEL,
    NOTETRANSPOSE_TARGET,
    '+1',
  ])
  gadgethyperlink(player, 'list', '$greencopy +2 (whole step up)', [
    'copyit',
    COPYIT_NOTE_TRANSPOSE_SENTINEL,
    NOTETRANSPOSE_TARGET,
    '+2',
  ])
  const shared = gadgetstate(player)
  shared.scrollname = 'transpose copy'
  shared.scroll = gadgetcheckqueue(player)
}
