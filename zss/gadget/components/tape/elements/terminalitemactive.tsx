import { useBlink } from '../../useblink'
import { TerminalItemProps } from '../common'

import { TerminalItem } from './terminalitem'

export function TerminalItemActive(props: TerminalItemProps) {
  const blink = useBlink()
  return <TerminalItem active blink={blink} {...props} />
}
