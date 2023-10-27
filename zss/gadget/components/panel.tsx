import React, { useMemo } from 'react'

import {
  tokenize,
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../data/textFormat'
import { TILES } from '../data/types'
import { loadDefaultCharset, loadDefaultPalette } from '../file/bytes'

import { Tiles } from './tiles'

const palette = loadDefaultPalette()
const charset = loadDefaultCharset()

interface PanelProps {
  name: string
  width: number
  height: number
  color: number
  bg: number
  text: (string | [string, string, string?])[]
}

export function Panel({ name, width, height, color, bg, text }: PanelProps) {
  const tiles: TILES = useMemo(() => {
    const size = width * height
    const context: WRITE_TEXT_CONTEXT = {
      x: 0,
      y: 0,
      width,
      activeColor: undefined,
      activeBg: undefined,
      chars: new Array(size).fill(0),
      colors: new Array(size).fill(color),
      bgs: new Array(size).fill(bg),
    }

    function colorReset() {
      context.activeColor = 14
      context.activeBg = 1
    }

    colorReset()
    text.forEach((line) => {
      if (context.y < height) {
        const isEven = context.y % 2 === 0
        if (typeof line === 'string') {
          if (tokenizeAndWriteTextFormat(line, context)) {
            colorReset()
          }
        } else {
          // handle hypertext
          const [target, label, maybeInput] = line

          // maybe parse input
          const tokens = tokenize(maybeInput || 'hypertext', true)
          if (tokens.tokens?.length) {
            const [inputType, ...args] = tokens.tokens.map((token) => {
              if (token.image[0] === '"') {
                return token.image.substring(1, token.image.length - 1)
              }
              return token.image
            })

            switch (inputType) {
              case 'hotkey': {
                const [maybeShortcut, maybeText] = args
                const shortcut = maybeShortcut || ''
                const text = maybeText || shortcut
                const trimmedText = text.trim()
                const indent = Math.max(0, text.length - trimmedText.length)
                tokenizeAndWriteTextFormat(
                  `${' '.repeat(indent)}${
                    isEven ? '$black$onltgray' : '$black$ondkcyan'
                  } ${trimmedText.toUpperCase()} $white$ondkblue ${label}`,
                  context,
                )
                break
              }
              case 'hypertext': {
                const [maybeChar, maybeColor] = args
                const char = maybeChar ?? 16
                const color = maybeColor ?? 'purple'
                tokenizeAndWriteTextFormat(
                  `  $${color}$${char}  $white${label}`,
                  context,
                )
                break
              }
              case 'range': {
                const [maybeMinLabel, maybeMaxLabel] = args
                const minLabel = maybeMinLabel || '1'
                const maxLabel = maybeMaxLabel || '9'
                tokenizeAndWriteTextFormat(
                  `$white${label} $white${minLabel} $white..$green+$white.:.... ${maxLabel}`,
                  context,
                )
                break
              }
              case 'select': {
                tokenizeAndWriteTextFormat(
                  `$white${label} $green${(args[0] ?? '').toUpperCase()}`,
                  context,
                )
                break
              }
              case 'number': {
                tokenizeAndWriteTextFormat(`$white${label} $green37`, context)
                break
              }
              case 'text':
                tokenizeAndWriteTextFormat(
                  `$white${label} $greenKrupts`,
                  context,
                )
                break

              default:
                // throw an unknown input type error ?
                tokenizeAndWriteTextFormat(
                  `$red unknown input type ${inputType}`,
                  context,
                )
                break
            }
          }

          colorReset()
        }
      }
    })

    return {
      char: context.chars,
      color: context.colors,
      bg: context.bgs,
    }
  }, [width, height, text])

  return (
    palette &&
    charset && (
      <Tiles
        width={width}
        height={height}
        {...tiles}
        palette={palette}
        charset={charset}
      />
    )
  )
}
