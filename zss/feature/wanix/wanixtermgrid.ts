export function readwanixtermgridsize(edge: { width: number; height: number }) {
  return {
    cols: Math.max(1, edge.width),
    rows: Math.max(1, edge.height),
  }
}
