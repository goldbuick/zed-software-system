import { DIVIDER } from 'zss/feature/writeui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { PT } from 'zss/words/types'

function ptstoarea(p1: PT, p2: PT) {
  return `${p1.x},${p1.y},${p2.x},${p2.y}`
}

export async function memoryinspectstyle(
  player: string,
  p1: PT,
  p2: PT,
  mode: string,
) {
  console.info('style it!', player, p1, p2, mode)
  // const board = memoryreadplayerboard(player)
  // const secretheap = await readsecretheap()
  // if (!ispresent(board) || !ispresent(secretheap)) {
  //   return
  // }
  // const x1 = Math.min(p1.x, p2.x)
  // const y1 = Math.min(p1.y, p2.y)
  // const x2 = Math.max(p1.x, p2.x)
  // const y2 = Math.max(p1.y, p2.y)
  // const width = x2 - x1 + 1
  // const height = y2 - y1 + 1
  // const iwidth = Math.min(secretheap.width, width)
  // const iheight = Math.min(secretheap.height, height)
  // switch (mode) {
  //   case 'pasteall': {
  //     for (let y = 0; y < iheight; ++y) {
  //       for (let x = 0; x < iwidth; ++x) {
  //         const idx = pttoindex({ x, y }, secretheap.width)
  //         boardsetterrain(board, {
  //           ...secretheap.terrain[idx],
  //           x: x1 + x,
  //           y: y1 + y,
  //         })
  //       }
  //     }
  //     for (let i = 0; i < secretheap.objects.length; ++i) {
  //       const obj = secretheap.objects[i]
  //       if (
  //         ispresent(obj.x) &&
  //         ispresent(obj.y) &&
  //         ptwithin(obj.x, obj.y, 0, width - 1, height - 1, 0)
  //       ) {
  //         boardobjectcreate(board, {
  //           ...obj,
  //           id: undefined,
  //           x: x1 + obj.x,
  //           y: y1 + obj.y,
  //         })
  //       }
  //     }
  //     break
  //   }
  //   case 'pasteobjects':
  //     for (let i = 0; i < secretheap.objects.length; ++i) {
  //       const obj = secretheap.objects[i]
  //       if (
  //         ispresent(obj.x) &&
  //         ispresent(obj.y) &&
  //         ptwithin(obj.x, obj.y, 0, width - 1, height - 1, 0)
  //       ) {
  //         boardobjectcreate(board, {
  //           ...obj,
  //           id: undefined,
  //           x: x1 + obj.x,
  //           y: y1 + obj.y,
  //         })
  //       }
  //     }
  //     break
  //   case 'pasteterrain':
  //     for (let y = 0; y < iheight; ++y) {
  //       for (let x = 0; x < iwidth; ++x) {
  //         const idx = pttoindex({ x, y }, secretheap.width)
  //         boardsetterrain(board, {
  //           ...secretheap.terrain[idx],
  //           x: x1 + x,
  //           y: y1 + y,
  //         })
  //       }
  //     }
  //     break
  //   case 'pasteterraintiled':
  //     for (let y = y1; y <= y2; ++y) {
  //       for (let x = x1; x <= x2; ++x) {
  //         const tx = (x - x1) % secretheap.width
  //         const ty = (y - y1) % secretheap.height
  //         const idx = pttoindex({ x: tx, y: ty }, secretheap.width)
  //         boardsetterrain(board, {
  //           ...secretheap.terrain[idx],
  //           x,
  //           y,
  //         })
  //       }
  //     }
  //     break
  // }
}

export function memoryinspectstylemenu(player: string, p1: PT, p2: PT) {
  const area = ptstoarea(p1, p2)
  gadgettext(player, `selected: ${p1.x},${p1.y} - ${p2.x},${p2.y}`)
  gadgethyperlink(player, 'batch', 'style chars?', [
    `stylechars`,
    'select',
    'no',
    '0',
    'yes',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'style colors?', [
    `stylecolors`,
    'select',
    'no',
    '0',
    'yes',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'style bgs?', [
    `stylebgs`,
    'select',
    'no',
    '0',
    'yes',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'style terrain & objects', [
    `styleall:${area}`,
    'hk',
    '1',
  ])
  gadgethyperlink(player, 'batch', 'style objects', [
    `styleobjects:${area}`,
    'hk',
    '2',
  ])
  gadgethyperlink(player, 'batch', 'style terrain', [
    `styleterrain:${area}`,
    'hk',
    '3',
  ])

  // send to player as a scroll
  const shared = gadgetstate(player)
  shared.scrollname = 'style'
  shared.scroll = gadgetcheckqueue(player)
}
