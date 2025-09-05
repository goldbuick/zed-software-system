// Display and rendering functions for AnsiLove

import type { DisplayData, RenderOptions, ScreenData } from './types'

export function display(
  raw: ScreenData,
  start: number,
  length: number,
): DisplayData {
  const data = raw.getData()

  start = start * raw.columns * 10
  const end = Math.min(start + length * raw.columns * 10, data.length)

  const screen: [number, number, number][] = []
  for (let i = start; i < end; i += 10) {
    if (data[i + 1]) {
      const chr = data[i]
      const fg = data.subarray(i + 2, i + 6)
      const bg = data.subarray(i + 6, i + 10)
      screen.push([chr, fg[0], bg[0]])
    } else {
      const chr = data[i]
      const fg = data[i + 2]
      const bg = data[i + 3]
      screen.push([chr, fg, bg])
    }
  }

  return {
    screen,
    palette: raw.palette,
    width: raw.columns,
    height: raw.rows,
  }
}

export function validateOptions(options?: RenderOptions): RenderOptions {
  options = options ?? {}
  const validatedOptions: RenderOptions = {}

  validatedOptions.icecolors =
    typeof options.icecolors === 'number' &&
    options.icecolors >= 0 &&
    options.icecolors <= 1
      ? options.icecolors
      : 0

  switch (options.bits) {
    case '8':
    case '9':
    case 'ced':
    case 'workbench':
      validatedOptions.bits = options.bits
      break
    default:
      validatedOptions.bits = '8'
  }

  validatedOptions.columns =
    typeof options.columns === 'number' && options.columns > 0
      ? options.columns
      : 160
  validatedOptions.font =
    typeof options.font === 'string' && options.font ? options.font : '80x25'
  validatedOptions.thumbnail =
    typeof options.thumbnail === 'number' &&
    options.thumbnail >= 0 &&
    options.thumbnail <= 3
      ? options.thumbnail
      : 0
  validatedOptions['2x'] =
    typeof options['2x'] === 'number' &&
    options['2x'] >= 0 &&
    options['2x'] <= 1
      ? options['2x']
      : 0
  validatedOptions.imagedata =
    typeof options.imagedata === 'number' &&
    options.imagedata >= 0 &&
    options.imagedata <= 1
      ? options.imagedata
      : 0
  validatedOptions.rows =
    typeof options.rows === 'number' && options.rows > 0 ? options.rows : 26
  validatedOptions['2J'] =
    typeof options['2J'] === 'number' &&
    options['2J'] >= 0 &&
    options['2J'] <= 1
      ? options['2J']
      : 1
  validatedOptions.filetype =
    typeof options.filetype === 'string' ? options.filetype : 'ans'

  return validatedOptions
}
