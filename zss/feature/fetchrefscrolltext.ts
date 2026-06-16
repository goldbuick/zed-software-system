import { ZNS_DOCS_NAMESPACE, znsread } from 'zss/feature/url'
import { romread } from 'zss/rom'

export async function fetchrefscrolltext(pagepath: string): Promise<string> {
  const slug = pagepath.replace(/[^a-zA-Z0-9/_-]/g, '').toLowerCase()
  if (slug) {
    const row = await znsread(ZNS_DOCS_NAMESPACE, slug)
    const znstext = row.value ?? ''
    if (znstext.trim()) {
      return znstext
    }
  }
  return romread(`refscroll:${pagepath}`) ?? ''
}
