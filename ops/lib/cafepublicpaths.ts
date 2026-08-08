import path from 'node:path'

const CAFE_PUBLIC = path.join(process.cwd(), 'cafe', 'public')

/** Shipped static asset dirs under cafe/public/ (Vite copies to site root). */
export const CAFE_PUBLIC_DAISY_DIR = path.join(CAFE_PUBLIC, 'daisy')
export const CAFE_PUBLIC_COEP_DIR = path.join(CAFE_PUBLIC, 'coep')

/** HTTP URL prefixes (no trailing slash). */
export const CAFE_PUBLIC_DAISY_URL = '/daisy'
export const CAFE_PUBLIC_COEP_URL = '/coep'
export const CAFE_PUBLIC_ARCHIVE_MAXIMILIAN_URL = '/archive/maximilian'
