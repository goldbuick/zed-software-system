import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemRangeProps {
  playerId: string
  active: boolean
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemRange({ label, args, context }: PanelItemRangeProps) {
  const [maybeMinLabel, maybeMaxLabel] = args
  const minLabel = maybeMinLabel || '1'
  const maxLabel = maybeMaxLabel || '9'
  tokenizeAndWriteTextFormat(
    `$white${label} $white${minLabel} $white..$green+$white.:.... ${maxLabel}`,
    context,
  )
  return null
}
