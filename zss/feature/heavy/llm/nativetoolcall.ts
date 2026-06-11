/** Format Gemma 4 native tool-call wire tokens for SFT corpus and tests. */
export function formatgemmanativetoolcall(
  name: string,
  args: Record<string, string>,
): string {
  const parts: string[] = []
  const keys = Object.keys(args)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    parts.push(`${key}:<|"|>${args[key]}<|"|>`)
  }
  return `<|tool_call>call:${name}{${parts.join(',')}}<tool_call|>`
}
