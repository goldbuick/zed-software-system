import { MAYBE, ispresent } from 'zss/mapping/types'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memorycollectboundaryidsforboard } from 'zss/memory/boundaryrouting'
import type { BOOK, CODE_PAGE_RUNTIME } from 'zss/memory/types'

export function memoryisboardready(board: string): boolean {
  if (!board) {
    return false
  }
  const rt = memoryboundaryget<CODE_PAGE_RUNTIME>(board)
  return ispresent(rt?.board)
}

export function memorycollecttickboundaries(
  book: MAYBE<BOOK>,
  boards: string[],
): string[] {
  const out = new Set<string>()
  for (const board of boards) {
    const rt = memoryboundaryget<CODE_PAGE_RUNTIME>(board)
    if (ispresent(rt?.board)) {
      const ids = memorycollectboundaryidsforboard(book, rt.board)
      for (const id of ids) {
        out.add(id)
      }
    }
  }
  return Array.from(out)
}
