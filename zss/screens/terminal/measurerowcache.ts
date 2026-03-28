import { measurerow } from 'zss/screens/tape/measure'

const ROW_HEIGHT_CACHE_MAX = 512

const rowheightcache = new Map<string, number>()

/** Shared LRU-backed row height cache for terminal layout (parent + rows). */
export function measurerowcached(
  item: string,
  maxwidth: number,
  rowh: number,
): number {
  const key = `${maxwidth}\0${rowh}\0${item}`
  const hit = rowheightcache.get(key)
  if (hit !== undefined) {
    return hit
  }
  const h = measurerow(item, maxwidth, rowh)
  if (rowheightcache.size >= ROW_HEIGHT_CACHE_MAX) {
    const first = rowheightcache.keys().next().value
    if (first !== undefined) {
      rowheightcache.delete(first)
    }
  }
  rowheightcache.set(key, h)
  return h
}
