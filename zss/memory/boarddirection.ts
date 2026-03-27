import { linepoints, ptdist, pttoindex } from 'zss/mapping/2d'
import { inorder, pick, shuffle } from 'zss/mapping/array'
import { MAYBE, isarray, isnumber, ispresent } from 'zss/mapping/types'
import {
  EVAL_DIR,
  STR_DIR,
  dirfromdelta,
  dirfrompts,
  ispt,
  mapstrdirtoconst,
  ptapplydir,
} from 'zss/words/dir'
import { isstrkind } from 'zss/words/kind'
import { DIR, PT } from 'zss/words/types'

import {
  memoryfindboardplayer,
  memoryreadelement,
  memoryreadelementbyidorindex,
  memoryreadidorindex,
  memoryreadobjectbypt,
  memoryreadterrain,
} from './boardaccess'
import { memoryreadboardbyevaldir, memoryreadelementstat } from './boards'
import { memoryreadflags } from './flags'
import {
  memorylistboardelementsbykind,
  memorypickboardnearestpt,
  memoryreadboardpath,
} from './spatialqueries'
import { memoryptwithinboard } from './boardtransitions'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT, BOARD_WIDTH } from './types'

function memoryevaldiraway(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  pt: PT,
  x: number,
  y: number,
): void {
  const dest = { x, y }
  const dx = dest.x - pt.x
  const dy = dest.y - pt.y
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    const collision = memoryreadelementstat(element, 'collision')
    const maybept = memoryreadboardpath(board, collision, pt, dest, true)
    if (ispresent(maybept) && (maybept.x !== x || maybept.y !== y)) {
      const step = memoryreadobjectbypt(board, maybept)
      if (!ispresent(step)) {
        pt.x = maybept.x
        pt.y = maybept.y
      }
    }
  } else {
    ptapplydir(pt, dirfromdelta(-dx, -dy))
  }
}

function memoryevaldirtoward(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  pt: PT,
  x: number,
  y: number,
): void {
  const dest = { x, y }
  const dx = dest.x - pt.x
  const dy = dest.y - pt.y
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    const collision = memoryreadelementstat(element, 'collision')
    const maybept = memoryreadboardpath(board, collision, pt, dest, false)
    if (ispresent(maybept) && (maybept.x !== x || maybept.y !== y)) {
      const step = memoryreadobjectbypt(board, maybept)
      if (!ispresent(step)) {
        pt.x = maybept.x
        pt.y = maybept.y
      }
    }
  } else {
    ptapplydir(pt, dirfromdelta(dx, dy))
  }
}

function memoryfloodfrompt(board: MAYBE<BOARD>, startpt: PT): PT[] {
  if (!ispresent(board) || !memoryptwithinboard(startpt)) {
    return []
  }
  const startterrain = memoryreadterrain(board, startpt.x, startpt.y)
  const startkind = startterrain?.kind ?? ''
  const results: PT[] = []
  const visited = new Set<number>()
  const queue: PT[] = [{ ...startpt }]
  while (queue.length) {
    const pt = queue.shift()
    if (!ispresent(pt) || !memoryptwithinboard(pt)) {
      continue
    }
    const idx = pttoindex(pt, BOARD_WIDTH)
    if (visited.has(idx)) {
      continue
    }
    visited.add(idx)
    const terrain = memoryreadterrain(board, pt.x, pt.y)
    if ((terrain?.kind ?? '') !== startkind) {
      continue
    }
    results.push({ ...pt })
    queue.push(
      { x: pt.x, y: pt.y - 1 },
      { x: pt.x, y: pt.y + 1 },
      { x: pt.x - 1, y: pt.y },
      { x: pt.x + 1, y: pt.y },
    )
  }
  return results
}

function memorybeamedgept(startpt: PT, towardpt: PT): PT {
  let dx = towardpt.x - startpt.x
  let dy = towardpt.y - startpt.y
  if (dx === 0 && dy === 0) {
    dx = 1
    dy = 0
  }
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const max = 2 * Math.max(BOARD_WIDTH, BOARD_HEIGHT)
  const endpt: PT = {
    x: Math.round(startpt.x + (dx / len) * max),
    y: Math.round(startpt.y + (dy / len) * max),
  }
  const line = linepoints(startpt.x, startpt.y, endpt.x, endpt.y)
  let edgept = startpt
  for (const pt of line) {
    if (!memoryptwithinboard(pt)) {
      break
    }
    edgept = pt
  }
  return edgept
}

function memorythicklinepts(startpt: PT, destpt: PT, width: number): PT[] {
  const halfwidth = Math.max(0, Math.floor((width - 1) / 2))
  const line = linepoints(startpt.x, startpt.y, destpt.x, destpt.y)
  const seen = new Set<number>()
  const results: PT[] = []
  for (let li = 0; li < line.length; ++li) {
    const pt = line[li]
    for (let dy = -halfwidth; dy <= halfwidth; ++dy) {
      for (let dx = -halfwidth; dx <= halfwidth; ++dx) {
        if (Math.abs(dx) + Math.abs(dy) > halfwidth) {
          continue
        }
        const q = { x: pt.x + dx, y: pt.y + dy }
        if (!memoryptwithinboard(q)) {
          continue
        }
        const idx = pttoindex(q, BOARD_WIDTH)
        if (seen.has(idx)) {
          continue
        }
        seen.add(idx)
        results.push(q)
      }
    }
  }
  return results
}

export function memoryevaldir(
  board: MAYBE<BOARD>,
  element: MAYBE<BOARD_ELEMENT>,
  player: string,
  dir: STR_DIR,
  startpt: PT,
): EVAL_DIR {
  const layer: DIR = DIR.MID
  if (!ispresent(board) || !ispresent(element)) {
    return { dir, startpt, destpt: startpt, layer, targets: [] }
  }

  const pt: PT = {
    x: element.x ?? 0,
    y: element.y ?? 0,
  }
  const step: PT = {
    x: pt.x + (element.stepx ?? 0),
    y: pt.y + (element.stepy ?? 0),
  }

  const flow = dirfrompts(pt, step)
  for (let i = 0; i < dir.length; ++i) {
    const dirconst = mapstrdirtoconst(dir[i])
    switch (dirconst) {
      case DIR.IDLE:
        break
      case DIR.NORTH:
      case DIR.SOUTH:
      case DIR.WEST:
      case DIR.EAST:
        ptapplydir(pt, dirconst)
        break
      case DIR.BY: {
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x += x
          pt.y += y
        }
        i += 2
        break
      }
      case DIR.TO: {
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = x
          pt.y = y
        }
        i += 2
        break
      }
      case DIR.AT: {
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          pt.x = x
          pt.y = y
        }
        i += 2
        break
      }
      case DIR.FLOW:
        ptapplydir(pt, flow)
        break
      case DIR.SEEK: {
        const playerobject = memoryfindboardplayer(board, element, player)
        if (ispt(playerobject)) {
          ptapplydir(pt, dirfrompts(startpt, playerobject))
        }
        break
      }
      case DIR.RNDNS:
        ptapplydir(pt, pick(DIR.NORTH, DIR.SOUTH))
        break
      case DIR.RNDNE:
        ptapplydir(pt, pick(DIR.NORTH, DIR.EAST))
        break
      case DIR.RND:
        ptapplydir(pt, pick(DIR.NORTH, DIR.SOUTH, DIR.WEST, DIR.EAST))
        break
      case DIR.CW:
      case DIR.CCW:
      case DIR.OPP:
      case DIR.RNDP: {
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 1),
          startpt,
        )

        pt.x = startpt.x
        pt.y = startpt.y
        switch (dirconst) {
          case DIR.CW:
            switch (dirfrompts(startpt, modeval.destpt)) {
              case DIR.NORTH:
                ptapplydir(pt, DIR.EAST)
                break
              case DIR.SOUTH:
                ptapplydir(pt, DIR.WEST)
                break
              case DIR.EAST:
                ptapplydir(pt, DIR.SOUTH)
                break
              case DIR.WEST:
                ptapplydir(pt, DIR.NORTH)
                break
            }
            break
          case DIR.CCW:
            switch (dirfrompts(startpt, modeval.destpt)) {
              case DIR.NORTH:
                ptapplydir(pt, DIR.WEST)
                break
              case DIR.SOUTH:
                ptapplydir(pt, DIR.EAST)
                break
              case DIR.EAST:
                ptapplydir(pt, DIR.NORTH)
                break
              case DIR.WEST:
                ptapplydir(pt, DIR.SOUTH)
                break
            }
            break
          case DIR.OPP:
            switch (dirfrompts(startpt, modeval.destpt)) {
              case DIR.NORTH:
                ptapplydir(pt, DIR.SOUTH)
                break
              case DIR.SOUTH:
                ptapplydir(pt, DIR.NORTH)
                break
              case DIR.EAST:
                ptapplydir(pt, DIR.WEST)
                break
              case DIR.WEST:
                ptapplydir(pt, DIR.EAST)
                break
            }
            break
          case DIR.RNDP:
            switch (dirfrompts(startpt, modeval.destpt)) {
              case DIR.NORTH:
              case DIR.SOUTH:
                pt.x += pick(-1, 1)
                break
              case DIR.WEST:
              case DIR.EAST:
                pt.y += pick(-1, 1)
                break
            }
            break
        }
        return { dir, startpt, destpt: pt, layer, targets: [] }
      }
      case DIR.FLEE: {
        const fleekind = dir[i + 1]
        if (isstrkind(fleekind)) {
          const nearest = memorypickboardnearestpt(
            pt,
            memorylistboardelementsbykind(board, fleekind),
          )
          if (ispresent(nearest) && ispt(nearest)) {
            memoryevaldiraway(board, element, pt, nearest.x, nearest.y)
          }
        }
        i += 1
        break
      }
      case DIR.FIND: {
        const findkind = dir[i + 1]
        if (isstrkind(findkind)) {
          const nearest = memorypickboardnearestpt(
            pt,
            memorylistboardelementsbykind(board, findkind),
          )
          if (ispresent(nearest) && ispt(nearest)) {
            memoryevaldirtoward(board, element, pt, nearest.x, nearest.y)
          }
        }
        i += 1
        break
      }
      case DIR.AWAY: {
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          memoryevaldiraway(board, element, pt, x, y)
        }
        i += 2
        break
      }
      case DIR.TOWARD: {
        const [x, y] = dir.slice(i + 1)
        if (isnumber(x) && isnumber(y)) {
          memoryevaldirtoward(board, element, pt, x, y)
        }
        i += 2
        break
      }
      case DIR.MID:
      case DIR.OVER:
      case DIR.UNDER:
      case DIR.GROUND: {
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 1),
          startpt,
        )
        modeval.layer = dirconst
        return modeval
      }
      case DIR.WITHIN: {
        const [amount] = dir.slice(i + 1)
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 2),
          startpt,
        )
        if (modeval.targets.length === 0 && isnumber(amount) && amount > 0) {
          for (let y = -amount; y <= amount; ++y) {
            for (let x = -amount; x <= amount; ++x) {
              const pt = {
                x: modeval.destpt.x + x,
                y: modeval.destpt.y + y,
              }
              if (memoryptwithinboard(pt)) {
                modeval.targets.push(pt)
              }
            }
          }
        }
        if (isnumber(amount) && amount > 0) {
          return {
            ...modeval,
            targets: modeval.targets.filter((maybept) => {
              if (ispt(maybept)) {
                const dist = ptdist(maybept, modeval.destpt)
                return dist <= amount
              }
              return false
            }),
          }
        }
        return modeval
      }
      case DIR.AWAYBY: {
        const [amount] = dir.slice(i + 1)
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 2),
          startpt,
        )
        if (modeval.targets.length === 0) {
          for (let y = -BOARD_WIDTH; y <= BOARD_WIDTH; ++y) {
            for (let x = -BOARD_WIDTH; x <= BOARD_WIDTH; ++x) {
              const pt = {
                x: modeval.destpt.x + x,
                y: modeval.destpt.y + y,
              }
              if (memoryptwithinboard(pt)) {
                modeval.targets.push(pt)
              }
            }
          }
        }
        if (isnumber(amount) && amount > 0) {
          return {
            ...modeval,
            targets: modeval.targets.filter((maybept) => {
              if (ispt(maybept)) {
                const dist = ptdist(maybept, modeval.destpt)
                return dist >= amount
              }
              return false
            }),
          }
        }
        return modeval
      }
      case DIR.ELEMENTS: {
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 1),
          startpt,
        )
        const scandir = dirfrompts(startpt, modeval.destpt)
        if (modeval.targets.length === 0) {
          for (let x = 0; x < BOARD_WIDTH; ++x) {
            if (x === startpt.x) {
              continue
            }
            const element = memoryreadelement(board, { x, y: startpt.y })
            if (ispt(element)) {
              modeval.targets.push(element)
            }
          }
          for (let y = 0; y < BOARD_HEIGHT; ++y) {
            if (y === startpt.y) {
              continue
            }
            const element = memoryreadelement(board, { x: startpt.x, y })
            if (ispt(element)) {
              modeval.targets.push(element)
            }
          }
        }
        modeval.targets = modeval.targets.filter(
          (element) => ispt(element) && dirfrompts(startpt, element) === scandir,
        )
        return modeval
      }
      case DIR.FLOOD: {
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 1),
          startpt,
        )
        const floodboard = memoryreadboardbyevaldir(modeval, board)
        const floodtargets = memoryfloodfrompt(floodboard, modeval.destpt)
        return {
          ...modeval,
          targets: floodtargets,
        }
      }
      case DIR.BEAM: {
        const [width] = dir.slice(i + 1)
        const modeval = memoryevaldir(
          board,
          element,
          player,
          dir.slice(i + 2),
          startpt,
        )
        const w = isnumber(width) && width >= 1 ? Math.floor(width) : 1
        const edgept = memorybeamedgept(startpt, modeval.destpt)
        const beamdir = {
          x: edgept.x - startpt.x,
          y: edgept.y - startpt.y,
        }
        let beamtargets = memorythicklinepts(startpt, edgept, w).filter(
          (pt) => pt.x !== startpt.x || pt.y !== startpt.y,
        )
        if (w > 1) {
          beamtargets = beamtargets.filter((pt) => {
            const along =
              (pt.x - startpt.x) * beamdir.x + (pt.y - startpt.y) * beamdir.y
            return along >= 0
          })
        }
        return {
          ...modeval,
          destpt: modeval.startpt,
          targets: beamtargets,
        }
      }
      case DIR.SELECT: {
        const [selectmode, kind] = dir.slice(i + 1)
        if (isstrkind(kind)) {
          const elements = memorylistboardelementsbykind(board, kind)
          const tracking = memoryreadflags(`tracking_${board.id}`)
          const [kindname, kindcolor] = kind
          const kindflag = [...(kindcolor ?? []), kindname].join('_')
          switch (selectmode) {
            case 'inorder': {
              if (!ispresent(tracking[kindflag])) {
                tracking[kindflag] = inorder(elements, (a, b) => {
                  const aa = `${memoryreadidorindex(a)}`
                  const bb = `${memoryreadidorindex(b)}`
                  return aa.localeCompare(bb)
                }).map(memoryreadidorindex)
              }
              break
            }
            case 'shuffle': {
              if (!ispresent(tracking[kindflag])) {
                tracking[kindflag] = shuffle(elements).map(memoryreadidorindex)
              }
              break
            }
            case 'random': {
              tracking[kindflag] = [memoryreadidorindex(pick(elements))]
              break
            }
          }
          if (isarray(tracking[kindflag])) {
            const target = tracking[kindflag].shift() as string
            const element = memoryreadelementbyidorindex(board, target)
            if (tracking[kindflag].length < 1) {
              delete tracking[kindflag]
            }
            return {
              dir,
              startpt,
              destpt: { x: element?.x ?? 0, y: element?.y ?? 0 },
              layer,
              targets: [],
            }
          }
        }
        return { dir, startpt, destpt: startpt, layer, targets: [] }
      }
    }
  }
  return { dir, startpt, destpt: pt, layer, targets: [] }
}
