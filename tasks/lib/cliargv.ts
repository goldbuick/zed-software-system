export function hasflag(argv: string[], ...names: string[]): boolean {
  for (let i = 0; i < argv.length; ++i) {
    if (names.includes(argv[i])) {
      return true
    }
  }
  return false
}

export function readlimit(argv: string[]): number | undefined {
  for (let i = 0; i < argv.length; ++i) {
    const arg = argv[i]
    if (arg === 'limit' || arg === '--limit') {
      const next = argv[i + 1]
      if (!next) {
        throw new Error('limit requires a number')
      }
      const limit = Number.parseInt(next, 10)
      if (!Number.isFinite(limit) || limit < 1) {
        throw new Error('limit must be a positive integer')
      }
      return limit
    }
  }
  return undefined
}

export function readforce(argv: string[]): boolean {
  return hasflag(argv, 'force', '--force')
}
