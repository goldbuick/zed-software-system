/** When true, short names map to display-layer stats (draw pass). */
export function mapdisplaystatname(
  usedisplaystats: boolean,
  name: string,
): string {
  if (!usedisplaystats) {
    return name
  }
  switch (name) {
    case 'color':
      return 'displaycolor'
    case 'char':
      return 'displaychar'
    case 'bg':
      return 'displaybg'
    default:
      return name
  }
}
