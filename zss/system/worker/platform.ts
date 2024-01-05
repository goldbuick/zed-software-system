import { compare, deepClone } from 'fast-json-patch'
import { customAlphabet } from 'nanoid'
import { numbers, lowercase } from 'nanoid-dictionary'
import { LAYER_TYPE, SPRITE } from 'zss/gadget/data/types'
import { indexToX, indexToY } from 'zss/mapping/2d'
import { select } from 'zss/mapping/array'
import { createDevice } from 'zss/network/device'
import { STATE } from 'zss/system/chip'
import { CODE_PAGE_TYPE } from 'zss/system/codepage'
import { clearscroll, gadgetstate } from 'zss/system/firmware/gadget'
import { LOGIN_SET } from 'zss/system/firmware/loader'
import { createOS } from 'zss/system/os'
import { TAPE_PAGES } from 'zss/system/software'
import { createVM } from 'zss/system/vm'

// limited chars so peerjs doesn't get mad
const justNumberChars = customAlphabet(numbers, 4)
const mixedChars = customAlphabet(`${numbers}${lowercase}`, 16)

// this should be unique every time the worker is created
export const sessionId = `sid_${justNumberChars()}_${mixedChars()}`

const os = createOS()
const vm = createVM()

// load default software
vm.load(TAPE_PAGES)

// tracking active player ids
const tracking: Record<string, number> = {}

// tracking gadget state for individual players
const syncstate: Record<string, STATE> = {}

const platform = createDevice('platform', [], (message) => {
  // console.info(message)
  switch (message.target) {
    case 'login':
      if (message.player) {
        const appgadget = select(vm.get('app:gadget'))
        if (appgadget?.type === CODE_PAGE_TYPE.CODE) {
          tracking[message.player] = 0
          vm.login(message.player)
          os.boot({
            group: message.player,
            firmware: LOGIN_SET,
            code: appgadget.code,
          })
        }
      }
      break

    case 'keydown':
      if (message.player) {
        console.info(message)
      }
      break

    case 'doot':
      if (message.player) {
        tracking[message.player] = 0
      }
      break

    case 'desync':
      if (message.player) {
        const state = gadgetstate(message.player)
        platform.emit('gadgetclient:reset', state, message.player)
      }
      break

    case 'clearscroll':
      if (message.player) {
        clearscroll(message.player)
      }
      break

    default:
      os.message(message)
      break
  }
})

// 100 is 10 fps, 66.666 is ~15 fps, 50 is 20 fps, 40 is 25 fps  1000 / x = 15
const TICK_RATE = 66.666
const TICK_FPS = Math.round(1000 / TICK_RATE)
console.info({ TICK_FPS })

// mainloop
const LOOP_TIMEOUT = 32 * 15
function tick() {
  // tick active board groups
  vm.active().forEach((boardId) => {
    os.tickGroup(boardId)
  })

  // tick player groups, and drop dead players
  Object.keys(tracking).forEach((id) => {
    // tick group
    os.tickGroup(id)

    // inc id idle time
    tracking[id] = tracking[id] || 0
    ++tracking[id]

    // nuke it after too many ticks without a doot
    if (tracking[id] > LOOP_TIMEOUT) {
      vm.logout(id)
      os.haltGroup(id)
      delete tracking[id]
      delete syncstate[id]
      // TODO: log info
      return
    }

    // we need to render each player view
    const playerstate = vm.player(id)
    if (!playerstate) {
      // TODO: raise error
      return
    }

    const [boardPage] = vm.get(playerstate.boardId)
    if (boardPage.type !== CODE_PAGE_TYPE.BOARD) {
      // TODO: raise error
      return
    }

    // write tiles layer, then write sprites layer
    const shared = gadgetstate(id)
    shared.layers = []

    // write terrain
    shared.layers.push({
      id: `${boardPage.id}_terrain`,
      type: LAYER_TYPE.TILES,
      width: boardPage.board.width,
      height: boardPage.board.height,
      char: boardPage.board.terrain.map((i) => i?.char ?? 0),
      color: boardPage.board.terrain.map((i) => i?.color ?? 0),
      bg: boardPage.board.terrain.map((i) => i?.bg ?? 0),
    })

    // write objects
    shared.layers.push({
      id: `${boardPage.id}_objects`,
      type: LAYER_TYPE.SPRITES,
      sprites: Object.values(boardPage.board.objects)
        .map((obj, index) => {
          if (obj) {
            return {
              id: obj.id,
              x: indexToX(index, boardPage.board.width),
              y: indexToY(index, boardPage.board.width),
              char: obj?.char,
              color: obj?.color,
              bg: obj?.bg,
            } as SPRITE
          }
          return null
        })
        .filter((obj) => obj)
        .sort((a, b) => {
          const ida = a?.id as string
          const idb = b?.id as string
          return ida.localeCompare(idb)
        }) as SPRITE[],
    })
  })

  // we need to sync gadget here
  Object.keys(tracking).forEach((player) => {
    const shared = gadgetstate(player)
    const patch = compare(syncstate[player] ?? {}, shared)
    if (patch.length) {
      syncstate[player] = deepClone(shared)
      platform.emit('gadgetclient:patch', patch, player)
    }
  })
}

// timer acc
let acc = 0
let previous = performance.now()
function wake() {
  const now = performance.now()
  const delta = now - previous

  acc += delta
  if (acc >= TICK_RATE) {
    acc %= TICK_RATE
    tick()
  }

  previous = now
  setTimeout(wake)
}

// server is ready
wake()
