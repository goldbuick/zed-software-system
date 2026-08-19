import {
  mediaqueueclipitemsfromstate,
  mediaqueuecliplines,
  mediaqueuecliponeline,
  mediaqueueclipsubmittedat,
} from 'zss/feature/mediaqueue/playlistcopy'
import type { MEDIAQUEUE_STATE } from 'zss/feature/mediaqueue/queue'

function emptystate(partial: Partial<MEDIAQUEUE_STATE> = {}): MEDIAQUEUE_STATE {
  return {
    urls: [],
    names: [],
    titles: [],
    submittedats: [],
    index: 0,
    perplayerlimit: 5,
    pendingurls: [],
    pendingnames: [],
    pendingtitles: [],
    pendingdurations: [],
    playedurls: [],
    playednames: [],
    playedtitles: [],
    playedsubmittedats: [],
    ...partial,
  }
}

describe('mediaqueue clipboard lines', () => {
  it('formats submitted time title url', () => {
    expect(
      mediaqueuecliponeline({
        submittedat: Date.UTC(2026, 7, 19, 16, 29, 0),
        title: 'On My Knees',
        name: 'goldbuick',
        url: 'https://youtu.be/abc',
      }),
    ).toBe('2026-08-19T16:29:00Z On My Knees https://youtu.be/abc')
  })

  it('strips milliseconds from iso time', () => {
    expect(mediaqueueclipsubmittedat(Date.UTC(2026, 7, 19, 16, 29, 0))).toBe(
      '2026-08-19T16:29:00Z',
    )
  })

  it('joins played then fifo and skips duplicate urls', () => {
    const lines = mediaqueuecliplines(
      mediaqueueclipitemsfromstate(
        emptystate({
          playedurls: ['https://a.example', 'https://b.example'],
          playednames: ['p1', 'p2'],
          playedtitles: ['A', 'B'],
          playedsubmittedats: [
            Date.UTC(2026, 7, 19, 1, 0, 0),
            Date.UTC(2026, 7, 19, 2, 0, 0),
          ],
          urls: ['https://b.example', 'https://c.example'],
          names: ['p2', 'p3'],
          titles: ['B', 'C'],
          submittedats: [
            Date.UTC(2026, 7, 19, 2, 0, 0),
            Date.UTC(2026, 7, 19, 3, 0, 0),
          ],
        }),
      ),
    )
    expect(lines).toBe(
      [
        '2026-08-19T01:00:00Z A https://a.example',
        '2026-08-19T02:00:00Z B https://b.example',
        '2026-08-19T03:00:00Z C https://c.example',
      ].join('\n'),
    )
  })
})
