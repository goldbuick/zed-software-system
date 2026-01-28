class modelcache {
  dbName = 'model-cache'
  storeName = 'models'
  version = 1
  db: IDBDatabase | null = null

  async init() {
    if (this.db) return this.db
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      request.onerror = () => reject(request.error as Error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'url',
          })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async get(url: string) {
    await this.init()
    return new Promise<ArrayBuffer | null>((resolve, reject) => {
      if (!this.db) return reject(new Error('IndexedDB not initialized'))
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(url)
      request.onerror = () => reject(request.error as Error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          const maxAge = 7 * 24 * 60 * 60 * 1000
          if (Date.now() - result.timestamp < maxAge) {
            resolve(result.data as ArrayBuffer)
          } else {
            void this.delete(url)
            resolve(null)
          }
        } else resolve(null)
      }
    })
  }

  async set(url: string, data: ArrayBuffer) {
    await this.init()
    return new Promise<void>((resolve, reject) => {
      if (!this.db) return reject(new Error('IndexedDB not initialized'))
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const req = store.put({ url, data, timestamp: Date.now() })
      req.onerror = () => reject(req.error as Error)
      req.onsuccess = () => resolve()
    })
  }

  async delete(url: string) {
    await this.init()
    return new Promise<void>((resolve, reject) => {
      if (!this.db) return reject(new Error('IndexedDB not initialized'))
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const req = store.delete(url)
      req.onerror = () => reject(req.error as Error)
      req.onsuccess = () => resolve()
    })
  }
}

export async function cachedfetch(url: string): Promise<Response> {
  const cache = new modelcache()

  // Try cache first
  const cachedData = await cache.get(url)
  if (cachedData) {
    const headers = new Headers()
    return new Response(cachedData, { headers })
  }

  // Otherwise fetch from network
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`)

  const data = await response.arrayBuffer()
  await cache.set(url, data)

  return new Response(data, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
