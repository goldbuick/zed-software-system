import { useBlink } from '../useblink'

import { TapeConsoleItem } from './item'

type ActiveItemProps = {
  text: string
  offset: number
}

export function ActiveItem({ text, offset }: ActiveItemProps) {
  const blink = useBlink()
  return <TapeConsoleItem active blink={blink} text={text} offset={offset} />
}
