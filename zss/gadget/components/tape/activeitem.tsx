import { WRITE_TEXT_CONTEXT } from 'zss/gadget/data/textformat'

import { useBlink } from '../useblink'

import { ConsoleItem } from './consoleitem'

type ActiveItemProps = {
  text: string
  offset: number
  context: WRITE_TEXT_CONTEXT
}

export function ActiveItem({ text, offset, context }: ActiveItemProps) {
  const blink = useBlink()
  return (
    <ConsoleItem
      active
      blink={blink}
      text={text}
      offset={offset}
      context={context}
    />
  )
}
