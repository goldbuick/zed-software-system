export const LIST_LEFT = 8

/** Center strip boundaries (chars); matches `elements` dither band. */
export function touchuileftedge(width: number) {
  return Math.floor(width * 0.333)
}

export function touchuirightedge(width: number) {
  return Math.round(width * 0.666)
}
