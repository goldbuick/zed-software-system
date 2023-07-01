import { useObservableDeep } from '@zss/yjs/binding'
import { useState, ReactElement } from 'react'

import { GLElementState, getGLElementState } from '../../data/gui'
import { ElementProps } from '../types'

type MaybeGLElementState = GLElementState | undefined

type ElementStateProps = ElementProps & {
  children: (state: MaybeGLElementState) => ReactElement | null
}

export function ElementState({ element, children }: ElementStateProps) {
  const [state, setState] = useState<GLElementState | undefined>()

  useObservableDeep(element, function () {
    setState(getGLElementState(element))
  })

  return children(state)
}
