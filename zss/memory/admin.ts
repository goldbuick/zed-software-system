import {
  get as idbget,
  getMany as idbgetmany,
  update as idbupdate,
} from 'idb-keyval'
import { SOFTWARE } from 'zss/device/session'
import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring } from 'zss/mapping/types'
import { COLOR } from 'zss/words/types'

import { boardobjectread } from './board'
import { bookelementdisplayread } from './book'

import {
  MEMORY_LABEL,
  memoryisoperator,
  memoryreadbookbysoftware,
  memoryreadflags,
  memoryreadoperator,
  memoryreadplayerboard,
} from '.'

// read / write from indexdb

async function writeidb<T>(
  key: string,
  updater: (oldValue: T | undefined) => T,
): Promise<void> {
  return idbupdate(key, updater)
}

function readconfigdefault(name: string) {
  switch (name) {
    case 'crt':
      return 'on'
    default:
      return 'off'
  }
}

async function writeconfig(name: string, value: string) {
  return writeidb(`config_${name}`, () => value)
}

async function readconfigall() {
  const lookup = [
    'config_crt',
    'config_lowrez',
    'config_scanlines',
    'config_voice2text',
  ]
  const configs = await idbgetmany<string>(lookup)
  return configs.map((value, index) => {
    const key = lookup[index]
    const keyname = key.replace('config_', '')
    if (!value) {
      return [keyname, readconfigdefault(keyname)]
    }
    return [keyname, value && value !== 'off' ? 'on' : 'off']
  })
}

export async function memoryadminmenu(player: string) {
  // get list of active players
  const isop = memoryisoperator(player)
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const activelistvalues = new Set<string>(mainbook?.activelist ?? [])
  activelistvalues.add(memoryreadoperator())
  const activelist = [...activelistvalues]

  // build userlist
  gadgettext(player, `active player list`)
  gadgettext(player, DIVIDER)
  for (let i = 0; i < activelist.length; ++i) {
    const player = activelist[i]
    const { user } = memoryreadflags(player)
    const withuser = isstring(user) ? user : 'player'
    const playerboard = memoryreadplayerboard(player)
    const playerelement = boardobjectread(playerboard, player)
    const icon = bookelementdisplayread(playerelement)
    const icontext = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR$CYAN`
    const location = `$WHITEis on ${playerboard?.name ?? 'void board'}`
    if (isop && ispresent(playerboard)) {
      gadgethyperlink(
        player,
        'admingoto',
        `${icontext} ${withuser} ${location}`,
        [player],
      )
    } else {
      gadgettext(player, `${icontext} ${withuser} ${isop ? location : ''}`)
    }
  }

  // build util list
  gadgettext(player, ``)
  gadgettext(player, `util list`)
  gadgettext(player, DIVIDER)
  gadgethyperlink(player, 'admin', 'turn on #gadget inspector', ['gadget'])
  gadgethyperlink(player, 'admin', 'turn on #dev mode', ['dev'])

  // build config list
  const configlist = await readconfigall()
  const configstate: Record<string, string> = {}
  gadgettext(player, ``)
  gadgettext(player, `config list`)
  gadgettext(player, DIVIDER)
  for (let i = 0; i < configlist.length; ++i) {
    const [key, value] = configlist[i]
    gadgethyperlink(
      player,
      'admin',
      key,
      [key, 'select', 'off', '0', 'on', '1'],
      (name) => {
        const newval = configstate[name] ?? value ?? readconfigdefault(name)
        return newval === 'on' ? 1 : 0
      },
      (name, value) => {
        configstate[name] = value ? 'on' : 'off'
        doasync(SOFTWARE, player, async () => {
          await writeconfig(name, configstate[name])
        })
      },
    )
  }

  // build qr code
  // qrlines()

  const shared = gadgetstate(player)
  shared.scrollname = 'cpu #admin'
  shared.scroll = gadgetcheckqueue(player)
}
