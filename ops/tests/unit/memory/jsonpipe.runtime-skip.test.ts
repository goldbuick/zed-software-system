import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'

type BooksDoc = {
  books: {
    x: {
      pages: Array<{
        board: {
          named?: Record<string, Set<string>>
          terrain: Array<{ char: number }>
          objects: Record<string, { kinddata?: { char: number }; char?: number }>
        }
      }>
      flags: Record<string, Record<string, unknown>>
    }
  }
}

function makebooksdoc(): BooksDoc {
  return {
    books: {
      x: {
        pages: [
          {
            board: {
              named: { player: new Set(['pid']) },
              terrain: [{ char: 1 }],
              objects: {
                o1: { kinddata: { char: 1 }, char: 5 },
              },
            },
          },
        ],
        flags: {
          bid_layers: { normal: { id: 'layer' } },
          durableplayer: { score: 1 },
        },
      },
    },
  }
}

describe('jsonpipe memoryrootshouldemitpath runtime skip', () => {
  it('memoryrootshouldemitpath rejects runtime and ephemeral flag paths', () => {
    expect(
      memoryrootshouldemitpath('/books/x/pages/0/board/named/player'),
    ).toBe(false)
    expect(
      memoryrootshouldemitpath('/books/x/pages/0/board/objects/o1/kinddata/char'),
    ).toBe(false)
    expect(memoryrootshouldemitpath('/books/x/flags/bid_layers/normal')).toBe(
      false,
    )
    expect(memoryrootshouldemitpath('/books/x/pages/0/board/terrain/0/char')).toBe(
      true,
    )
    expect(memoryrootshouldemitpath('/books/x/flags/durableplayer/score')).toBe(
      true,
    )
  })

  it('emitdiff does not throw when board.named holds a Set', () => {
    const base = makebooksdoc()
    const pipe = createjsonpipe<BooksDoc>(
      deepcopy(base),
      memoryrootshouldemitpath,
    )
    expect(() => pipe.emitdiff(base)).not.toThrow()
  })

  it('emitdiff skips runtime named / kinddata and ephemeral _layers flags', () => {
    const base = makebooksdoc()
    const pipe = createjsonpipe<BooksDoc>(
      deepcopy(base),
      memoryrootshouldemitpath,
    )
    // Establish shadow after init (deepcopy turns Set into {}).
    pipe.emitdiff(base)

    const next = deepcopy(base)
    next.books.x.pages[0].board.named = {
      player: new Set(['pid', 'other']),
    }
    next.books.x.pages[0].board.objects.o1.kinddata = { char: 99 }
    next.books.x.flags.bid_layers = { normal: { id: 'changed' } }

    const ops = pipe.emitdiff(next)
    expect(ops.every((op) => memoryrootshouldemitpath(op.path))).toBe(true)
    expect(
      ops.some(
        (op) =>
          op.path.includes('/named/') ||
          op.path.includes('/kinddata/') ||
          op.path.includes('/flags/bid_layers'),
      ),
    ).toBe(false)
  })

  it('emitdiff emits durable terrain and player flag changes', () => {
    const base = makebooksdoc()
    const pipe = createjsonpipe<BooksDoc>(
      deepcopy(base),
      memoryrootshouldemitpath,
    )
    pipe.emitdiff(base)

    const next = deepcopy(base)
    next.books.x.pages[0].board.terrain[0].char = 42
    next.books.x.flags.durableplayer.score = 9

    const ops = pipe.emitdiff(next)
    const paths = ops.map((op) => op.path)
    expect(paths).toContain('/books/x/pages/0/board/terrain/0/char')
    expect(paths).toContain('/books/x/flags/durableplayer/score')
  })
})
