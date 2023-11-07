/*

What is a VM? a vm runs / executes a collection of code pages
and includes needed run-time state

we need the concept of players & pilots here
we need to get the list of active boards to run
we need to get main gadget code

*/

import { BOARD } from './board'
import { CODE_PAGE, CODE_PAGE_TYPE } from './codepage'

export type VM = {
  load: (codepages: CODE_PAGE[]) => void
  get: (idOrName: string) => CODE_PAGE[]
  board: (idOrName: string) => BOARD[]
  login: (playerId: string) => void
  logout: (playerId: string) => void
}

export function createVM() {
  // content
  let codepages: CODE_PAGE[] = []

  // lookups
  let byId: Record<string, CODE_PAGE> = {}
  let byName: Record<string, CODE_PAGE[]> = {}
  let boardById: Record<string, BOARD> = {}
  let boardByName: Record<string, BOARD[]> = {}

  // players/pilots
  // ??

  const vm: VM = {
    load(incoming) {
      byId = {}
      byName = {}
      boardById = {}
      boardByName = {}

      codepages = incoming

      codepages.forEach((codepage) => {
        const name = codepage.name.toLowerCase()

        // create lookups
        byId[codepage.id] = codepage
        if (!byName[name]) {
          byName[name] = []
        }
        byName[name].push(codepage)

        codepage.entries.forEach((entry) => {
          switch (entry.type) {
            case CODE_PAGE_TYPE.BOARD: {
              const boardname = entry.name.toLowerCase()

              // create lookups
              boardById[entry.id] = entry.board
              if (!boardByName[boardname]) {
                boardByName[boardname] = []
              }
              boardByName[boardname].push(entry.board)
              break
            }
          }
        })
      })
    },
    get(idOrName) {
      if (byId[idOrName] !== undefined) {
        return [byId[idOrName]]
      }

      const name = idOrName.toLowerCase()
      if (byName[name] !== undefined) {
        return byName[name]
      }

      return []
    },
    board(idOrName) {
      if (boardById[idOrName] !== undefined) {
        return [boardById[idOrName]]
      }

      const name = idOrName.toLowerCase()
      if (boardByName[name] !== undefined) {
        return boardByName[name]
      }

      return []
    },
    login(playerId) {
      //
    },
    logout(playerId) {
      //
    },
  }

  return vm
}
