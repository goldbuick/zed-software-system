const CACHE_NAME = 'zss-heavy-models'

const inflight = new Map<string, Promise<Response>>()

function normalizerequesturl(url: string): string {
  return new URL(url).href
}

async function opencache(): Promise<Cache | undefined> {
  if (typeof caches === 'undefined') {
    return undefined
  }
  try {
    return await caches.open(CACHE_NAME)
  } catch (e) {
    console.warn('[modelcache] Cache Storage unavailable:', e)
    return undefined
  }
}

async function fetchandstore(
  cache: Cache | undefined,
  request: Request,
): Promise<Response> {
  const response = await fetch(request)
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }
  if (cache) {
    try {
      await cache.put(request, response.clone())
    } catch (e) {
      console.warn('[modelcache] cache.put failed:', e)
    }
  }
  return response
}

async function loadfromcacheornetwork(key: string): Promise<Response> {
  try {
    const request = new Request(key, { mode: 'cors' })
    const cache = await opencache()
    if (cache) {
      const hit = await cache.match(request)
      if (hit) {
        return hit
      }
    }
    return fetchandstore(cache, request)
  } finally {
    inflight.delete(key)
  }
}

export async function cachedfetch(url: string): Promise<Response> {
  const key = normalizerequesturl(url)
  if (!inflight.has(key)) {
    inflight.set(key, loadfromcacheornetwork(key))
  }
  return inflight.get(key) as Promise<Response>
}
