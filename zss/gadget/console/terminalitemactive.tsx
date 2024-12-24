import { useBlink } from '../hooks'
import { TerminalItemProps } from '../tape/common'

import { TerminalItem } from './terminalitem'

export function TerminalItemActive(props: TerminalItemProps) {
  const blink = useBlink()
  return <TerminalItem active blink={blink} {...props} />
}
