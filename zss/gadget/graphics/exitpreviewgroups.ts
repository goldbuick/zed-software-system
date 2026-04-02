import type { GADGET_STATE, LAYER } from 'zss/gadget/data/types'
import {
  type ExitPreviewResolve,
  resolveexitpreview,
} from 'zss/gadget/graphics/exitpreviewresolve'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type ExitPreviewGroup = {
  key: string
  preview: ExitPreviewResolve
  position: [number, number, number]
}

type ExitBoardGadget = Pick<
  GADGET_STATE,
  | 'exiteast'
  | 'exitwest'
  | 'exitnorth'
  | 'exitsouth'
  | 'exitne'
  | 'exitnw'
  | 'exitse'
  | 'exitsw'
>

/** Adjacent-board exit previews at fixed offsets (flat / mode7 / iso). */
export function buildexitpreviewgroups(
  gadget: ExitBoardGadget,
  layercachemap: Map<string, LAYER[]>,
  drawwidth: number,
  drawheight: number,
): ExitPreviewGroup[] {
  return [
    {
      key: 'e',
      preview: resolveexitpreview(gadget.exiteast, layercachemap, 'e'),
      position: [BOARD_WIDTH * drawwidth, 0, 0],
    },
    {
      key: 'w',
      preview: resolveexitpreview(gadget.exitwest, layercachemap, 'w'),
      position: [BOARD_WIDTH * -drawwidth, 0, 0],
    },
    {
      key: 'n',
      preview: resolveexitpreview(gadget.exitnorth, layercachemap, 'n'),
      position: [0, BOARD_HEIGHT * -drawheight, 0],
    },
    {
      key: 's',
      preview: resolveexitpreview(gadget.exitsouth, layercachemap, 's'),
      position: [0, BOARD_HEIGHT * drawheight, 0],
    },
    {
      key: 'ne',
      preview: resolveexitpreview(gadget.exitne, layercachemap, 'ne'),
      position: [BOARD_WIDTH * drawwidth, BOARD_HEIGHT * -drawheight, 0],
    },
    {
      key: 'nw',
      preview: resolveexitpreview(gadget.exitnw, layercachemap, 'nw'),
      position: [BOARD_WIDTH * -drawwidth, BOARD_HEIGHT * -drawheight, 0],
    },
    {
      key: 'se',
      preview: resolveexitpreview(gadget.exitse, layercachemap, 'se'),
      position: [BOARD_WIDTH * drawwidth, BOARD_HEIGHT * drawheight, 0],
    },
    {
      key: 'sw',
      preview: resolveexitpreview(gadget.exitsw, layercachemap, 'sw'),
      position: [BOARD_WIDTH * -drawwidth, BOARD_HEIGHT * drawheight, 0],
    },
  ]
}
