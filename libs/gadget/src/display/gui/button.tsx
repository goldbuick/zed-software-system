import { useObservableDeep } from '@zss/yjs/binding'
import { useState } from 'react'

import { ElementProps } from '../types'

import { MoveCursor } from './context'
import { Element, writeString } from './element'
import { THEME_COLOR } from './theme'

export function Button({ element }: ElementProps) {
  const [label, setLabel] = useState('')

  useObservableDeep(element, function () {
    setLabel(element?.get('label') ?? '')
  })

  const width = label.length + 2
  const height = 1
  const count = width * height

  const chars = writeString(` ${label.toUpperCase()} `)
  const colors = Array(count).fill(THEME_COLOR.PRIMARY_TEXT)
  const bgs = Array(count).fill(THEME_COLOR.PRIMARY)

  return (
    <MoveCursor width={width + 1} height={height}>
      <Element
        key={count}
        width={width}
        height={height}
        chars={chars}
        colors={colors}
        bgs={bgs}
      ></Element>
    </MoveCursor>
  )
}
