import { useBlink } from '../gadget/hooks'
import { TapeTerminalItemProps } from '../tape/common'

import { TapeTerminalItem } from './item'

export function TapeTerminalItemActive(props: TapeTerminalItemProps) {
  const blink = useBlink()
  return <TapeTerminalItem active blink={blink} {...props} />
}
