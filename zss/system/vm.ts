import { select } from '../mapping/array'

import { CODE_PAGE, CODE_PAGE_ENTRY, CODE_PAGE_TYPE } from './codepage'

export type VM_PLAYER = {
  playerId: string
  boardId: string
}

export type VM = {
  get: (name: string) => CODE_PAGE_ENTRY[]
  load: (codepages: CODE_PAGE[]) => void
  login: (playerId: string) => void
  logout: (playerId: string) => void
  active: () => string[]
  player: (playerId: string) => VM_PLAYER | undefined
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
    get(name) {
      return byEntryName[name]
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
      const player = players[playerId]
      if (player) {
        // remove player from board

        // remove player from tracking
        delete players[playerId]
      }
    },
    active() {
      const boardids = new Set<string>()
      Object.values(players).forEach((player) => boardids.add(player.boardId))
      return [...boardids]
    },
    player(playerId) {
      return players[playerId]
    },
  }

  return vm
}
