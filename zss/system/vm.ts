/*

What is a VM? a vm runs / executes a collection of code pages
and includes needed run-time state

we need the concept of players & pilots here
we need to get the list of active boards to run
we need to get main gadget code

*/

import { select } from '../mapping/array'

import { CODE_PAGE, CODE_PAGE_ENTRY, CODE_PAGE_TYPE } from './codepage'

export type VM_PLAYER = {
  playerId: string
  boardId: string
}

export type VM = {
  load: (codepages: CODE_PAGE[]) => void
  get: (name: string) => CODE_PAGE_ENTRY[]
  login: (playerId: string) => void
  logout: (playerId: string) => void
}

export function createVM() {
  // content
  let codepages: CODE_PAGE[] = []

  // lookups
  let byId: Record<string, CODE_PAGE> = {}
  let byEntryId: Record<string, CODE_PAGE_ENTRY> = {}
  let byEntryName: Record<string, CODE_PAGE_ENTRY[]> = {}

  // players/pilots
  let players: Record<string, VM_PLAYER> = {}

  const vm: VM = {
    load(incoming) {
      byId = {}
      byEntryId = {}
      byEntryName = {}
      players = {}
      codepages = incoming

      // create lookups
      codepages.forEach((codepage) => {
        // create code page lookups
        byId[codepage.id] = codepage
        // create code page entry lookups
        codepage.entries.forEach((entry) => {
          // id lookup
          byEntryId[entry.id] = entry
          // named lookup
          const entryname = `${codepage.name.toLowerCase()}:${entry.name.toLowerCase()}`
          byEntryName[entryname] = byEntryName[entryname] || []
          byEntryName[entryname].push(entry)
        })
      })

      // ahhh, what do here ??
    },
    get(name) {
      return byEntryName[name]
    },
    login(playerId) {
      const apptitle = select(vm.get('app:title'))
      if (!apptitle || apptitle.type !== CODE_PAGE_TYPE.BOARD) {
        return // raise error
      }

      // create player
      players[playerId] = {
        playerId,
        boardId: apptitle.id,
      }
    },
    logout(playerId) {
      //
    },
  }

  return vm
}
