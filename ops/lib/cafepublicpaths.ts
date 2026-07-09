import path from 'node:path'

const CAFE_PUBLIC = path.join(process.cwd(), 'cafe', 'public')

/** Shipped static asset dirs under cafe/public/ (Vite copies to site root). */
export const CAFE_PUBLIC_DAISY_DIR = path.join(CAFE_PUBLIC, 'daisy')
export const CAFE_PUBLIC_COEP_DIR = path.join(CAFE_PUBLIC, 'coep')
export const CAFE_PUBLIC_WANIX_DIR = path.join(CAFE_PUBLIC, 'wanix')
export const CAFE_PUBLIC_MEMORY_DIR = path.join(CAFE_PUBLIC, 'memory')
export const CAFE_PUBLIC_LANG_DIR = path.join(CAFE_PUBLIC, 'lang')
export const CAFE_PUBLIC_RUNTIME_DIR = path.join(CAFE_PUBLIC, 'runtime')

/** HTTP URL prefixes (no trailing slash). */
export const CAFE_PUBLIC_DAISY_URL = '/daisy'
export const CAFE_PUBLIC_COEP_URL = '/coep'
export const CAFE_PUBLIC_WANIX_URL = '/wanix'
export const CAFE_PUBLIC_MEMORY_URL = '/memory'
export const CAFE_PUBLIC_LANG_URL = '/lang'
export const CAFE_PUBLIC_RUNTIME_URL = '/runtime'
export const CAFE_PUBLIC_ARCHIVE_MAXIMILIAN_URL = '/archive/maximilian'

export const CAFE_PUBLIC_WANIX_HOST_WASM = path.join(
  CAFE_PUBLIC_WANIX_DIR,
  'wanix.wasm',
)
export const CAFE_PUBLIC_ZEDCAFE_WASM = path.join(
  CAFE_PUBLIC_WANIX_DIR,
  'zedcafe.wasm',
)
export const CAFE_PUBLIC_FINDPLAYERS_WASM = path.join(
  CAFE_PUBLIC_WANIX_DIR,
  'findplayers.wasm',
)
