import React from 'react'

import {
  WRITE_TEXT_CONTEXT,
  tokenize,
  tokenizeAndWriteTextFormat,
  writeTextColorReset,
} from '../../data/textFormat'
import { PANEL_ITEM } from '../../data/types'

import { PanelItemHotkey } from './hotkey'
import { PanelItemHyperText } from './hypertext'
import { PanelItemNumber } from './number'
import { PanelItemRange } from './range'
import { PanelItemSelect } from './select'
import { PanelItemText } from './text'
import { PanelItemInputText } from './textinput'

interface PanelItemProps {
  item: PANEL_ITEM
  active: boolean
  playerId: string
  context: WRITE_TEXT_CONTEXT
}

export function PanelItem({ item, active, playerId, context }: PanelItemProps) {
  context.isEven = context.y % 2 === 0

  if (typeof item === 'string') {
    return <PanelItemText playerId={playerId} item={item} context={context} />
  } else {
    // handle hypertext
    const [target, label, maybeInput] = item

    // maybe parse input
    const tokens = tokenize(maybeInput || 'hypertext', true)
    if (tokens.tokens?.length) {
      const [inputType, ...args] = tokens.tokens.map((token) => {
        if (token.image[0] === '"') {
          return token.image.substring(1, token.image.length - 1)
        }
        return token.image
      })

      switch (inputType.toLowerCase()) {
        case 'hotkey':
          return (
            <PanelItemHotkey
              playerId={playerId}
              active={active}
              target={target}
              label={label}
              args={args}
              context={context}
            />
          )
        case 'hypertext':
          return (
            <PanelItemHyperText
              playerId={playerId}
              active={active}
              target={target}
              label={label}
              args={args}
              context={context}
            />
          )
        case 'range':
          return (
            <PanelItemRange
              playerId={playerId}
              active={active}
              target={target}
              label={label}
              args={args}
              context={context}
            />
          )
        case 'select':
          return (
            <PanelItemSelect
              playerId={playerId}
              active={active}
              target={target}
              label={label}
              args={args}
              context={context}
            />
          )
        case 'number':
          return (
            <PanelItemNumber
              playerId={playerId}
              active={active}
              target={target}
              label={label}
              args={args}
              context={context}
            />
          )
        case 'text':
          return (
            <PanelItemInputText
              playerId={playerId}
              active={active}
              target={target}
              label={label}
              args={args}
              context={context}
            />
          )
        default:
          // throw an unknown input type error ?
          tokenizeAndWriteTextFormat(
            `$red unknown input type ${inputType}`,
            context,
          )
          break
      }
    }
    writeTextColorReset(context)
  }
  return null
}
