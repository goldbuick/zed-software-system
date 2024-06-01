import { useBlink } from '../useblink'

import { ConsoleItem } from './consoleitem'

type ActiveItemProps = {
  text: string
  offset: number
}

export function ActiveItem({ text, offset }: ActiveItemProps) {
  const blink = useBlink()
  return <ConsoleItem active text={text} blink={blink} offset={offset} />
}
