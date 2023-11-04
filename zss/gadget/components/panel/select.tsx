import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemSelectProps {
  playerId: string
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemSelect({
  playerId,
  target,
  label,
  args,
  context,
}: PanelItemSelectProps) {
  tokenizeAndWriteTextFormat(
    `$white${label} $green${(args[0] ?? '').toUpperCase()}`,
    context,
  )
  return null
}
