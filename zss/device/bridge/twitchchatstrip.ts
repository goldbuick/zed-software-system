/** Strip Twitch emote spans from plaintext; preserve http(s) URLs for loaders. */
export function striptext(msg: {
  text: string
  emoteOffsets: Map<string, string[]>
}): string {
  let plaintext = msg.text
  const ranges = [...msg.emoteOffsets.values()]
  for (let r = 0; r < ranges.length; ++r) {
    const indexes = ranges[r].reverse()
    for (let i = 0; i < indexes.length; ++i) {
      const [start, end] = indexes[i].split('-').map(parseFloat)
      plaintext = plaintext.substring(0, start) + plaintext.substring(end + 1)
    }
  }
  return plaintext
}
