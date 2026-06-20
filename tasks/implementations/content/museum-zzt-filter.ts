export type MuseumDetail = {
  id: number
  detail: string
}

export type MuseumFile = {
  letter: string
  filename: string
  title: string
  author: string[]
  genres: string[]
  checksum: string
  archive_name: string
  size: number
  details: MuseumDetail[]
  publish_date?: string
  playable_boards?: number
  total_boards?: number
}

const EXCLUDED_DETAILS = new Set([
  'Weave ZZT World',
  'Super ZZT World',
  'Super ZZT Board',
])

export function isvanillazztworld(entry: MuseumFile): boolean {
  const tags = entry.details.map((detail) => detail.detail)
  if (!tags.includes('ZZT World')) {
    return false
  }
  for (const tag of tags) {
    if (EXCLUDED_DETAILS.has(tag)) {
      return false
    }
  }
  if (entry.archive_name.startsWith('wzzt_')) {
    return false
  }
  if (entry.archive_name.startsWith('szzt_')) {
    return false
  }
  return true
}

export type MuseumFilterStats = {
  catalog_total: number
  included: number
  excluded_weave: number
  excluded_super: number
  excluded_no_zzt_world: number
}

export function classifymuseumfile(entry: MuseumFile): keyof MuseumFilterStats {
  const tags = entry.details.map((detail) => detail.detail)
  if (tags.includes('Weave ZZT World') || entry.archive_name.startsWith('wzzt_')) {
    return 'excluded_weave'
  }
  if (
    tags.includes('Super ZZT World') ||
    tags.includes('Super ZZT Board') ||
    entry.archive_name.startsWith('szzt_')
  ) {
    return 'excluded_super'
  }
  if (!tags.includes('ZZT World')) {
    return 'excluded_no_zzt_world'
  }
  return 'included'
}

export function filtervanillazztworlds(entries: MuseumFile[]): {
  included: MuseumFile[]
  stats: MuseumFilterStats
} {
  const stats: MuseumFilterStats = {
    catalog_total: entries.length,
    included: 0,
    excluded_weave: 0,
    excluded_super: 0,
    excluded_no_zzt_world: 0,
  }
  const included: MuseumFile[] = []
  for (const entry of entries) {
    const bucket = classifymuseumfile(entry)
    if (bucket === 'included') {
      stats.included += 1
      included.push(entry)
    } else {
      stats[bucket] += 1
    }
  }
  return { included, stats }
}
