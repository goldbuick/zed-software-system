import { useBlink } from '../hooks'
import { ConsoleItemProps } from '../tape/common'

import { ConsoleItem } from './item'

export function ConsoleItemActive(props: ConsoleItemProps) {
  const blink = useBlink()
  return <ConsoleItem active blink={blink} {...props} />
}
