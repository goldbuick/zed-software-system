import { select } from '../mapping/array'

import { CODE_PAGE, CODE_PAGE_ENTRY, CODE_PAGE_TYPE } from './codepage'

export type VM_PLAYER = {
  player: string
  boardId: string
}

export type VM = {
  get: (nameOrId: string) => CODE_PAGE_ENTRY[]
  load: (codepages: CODE_PAGE[]) => void
  login: (player: string) => void
  logout: (player: string) => void
  active: () => string[]
  player: (player: string) => VM_PLAYER | undefined
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
    get(nameOrId) {
      const entry = byEntryId[nameOrId]
      if (entry) {
        return [entry]
      }
      return byEntryName[nameOrId.toLowerCase()] ?? []
    },
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
    },
    login(player) {
      const apptitle = select(vm.get('app:title'))
      if (!apptitle || apptitle.type !== CODE_PAGE_TYPE.BOARD) {
        return // raise error
      }

      // create player
      players[player] = {
        player,
        boardId: apptitle.id,
      }
    },
    logout(id) {
      const player = players[id]
      if (player) {
        // remove player from board

        // remove player from tracking
        delete players[id]
      }
    },
    active() {
      const boardids = new Set<string>()
      Object.values(players).forEach((player) => boardids.add(player.boardId))
      return [...boardids]
    },
    player(player) {
      return players[player]
    },
  }

  return vm
}
