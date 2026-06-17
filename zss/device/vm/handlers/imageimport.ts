import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  IMAGE_IMPORT_MAX_COLS,
  IMAGE_IMPORT_MAX_ROWS,
  IMAGE_IMPORT_SCALE_PRESETS,
  boardcountforcells,
  cellcolsrows,
  clearstagedimage,
  imageimportwithincap,
  parseimagefromstage,
  readstagedimage,
} from 'zss/feature/parse/image'
import { zsstexttape, zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

export function handlereadimageimport(_vm: DEVICE, message: MESSAGE): void {
  const pending = readstagedimage()
  const lines: string[] = []
  lines.push('$CENTER Import Image')

  if (!pending) {
    lines.push('$gray no image staged')
    scrollwritelines(
      message.player,
      'imageimport',
      zsstexttape(lines).trim(),
      'imageimport',
    )
    return
  }

  lines.push(`$white${pending.filename}`)
  lines.push(
    `$gray ${pending.width}×${pending.height} px$white max ${IMAGE_IMPORT_MAX_COLS}×${IMAGE_IMPORT_MAX_ROWS} cells`,
  )

  for (let i = 0; i < IMAGE_IMPORT_SCALE_PRESETS.length; ++i) {
    const scale = IMAGE_IMPORT_SCALE_PRESETS[i]
    const pct = Math.round(scale * 100)
    const { cols, rows } = cellcolsrows(pending.width, pending.height, scale)
    const { boardx, boardy } = boardcountforcells(cols, rows)
    if (imageimportwithincap(pending.width, pending.height, scale)) {
      lines.push(
        zsszedlinkline(
          `imageimport ${scale}`,
          `$white${pct}%$gray — ${cols}×${rows} cells, ${boardx}×${boardy} boards`,
        ),
      )
    } else {
      lines.push(
        `$dkgray ${pct}% — ${cols}×${rows} cells (too large)`,
      )
    }
  }

  lines.push(zsszedlinkline('imageimport cancel', '$red Cancel'))
  scrollwritelines(
    message.player,
    'imageimport',
    zsstexttape(lines).trim(),
    'imageimport',
  )
}

export async function handleimageimport(
  _vm: DEVICE,
  message: MESSAGE,
  path: string,
) {
  const trimmed = path.trim()
  if (trimmed === 'cancel') {
    clearstagedimage()
    return
  }

  const scale = parseFloat(trimmed)
  if (!Number.isFinite(scale) || scale <= 0) {
    return
  }

  const pending = readstagedimage()
  if (!pending) {
    return
  }

  if (!imageimportwithincap(pending.width, pending.height, scale)) {
    return
  }

  await parseimagefromstage(message.player, scale)
}