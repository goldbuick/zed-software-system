import { ZNS_DOCS_NAMESPACE, fetchznstext, znsdocsfetchenabled } from 'zss/feature/url'
import { romread } from 'zss/rom'

export async function fetchrefscrolltext(pagepath: string): Promise<string> {
  const slug = pagepath.replace(/[^a-zA-Z0-9/_-]/g, '').toLowerCase()
  if (slug && znsdocsfetchenabled()) {
    const znstext = await fetchznstext(ZNS_DOCS_NAMESPACE, slug)
    if (znstext.trim()) {
      return znstext
    }
  }
  return romread(`refscroll:${pagepath}`) ?? ''
}
