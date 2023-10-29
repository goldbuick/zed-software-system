import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemHyperTextProps {
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemHyperText({
  target,
  label,
  args,
  context,
}: PanelItemHyperTextProps) {
  const [maybeChar, maybeColor] = args
  const char = maybeChar ?? 16
  const color = maybeColor ?? 'purple'
  tokenizeAndWriteTextFormat(`  $${color}$${char}  $white${label}`, context)
  return null
}
