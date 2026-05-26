import { romread } from 'zss/feature/rom'
import { ZNS_DOCS_NAMESPACE, fetchznstext } from 'zss/feature/url'

export async function fetchrefscrolltext(pagepath: string): Promise<string> {
  const rom = romread(`refscroll:${pagepath}`)
  if (rom) {
    return rom
  }
  const slug = pagepath.replace(/[^a-zA-Z0-9/_-]/g, '').toLowerCase()
  if (!slug) {
    return ''
  }
  return fetchznstext(ZNS_DOCS_NAMESPACE, slug)
}
