import type { MEDIAQUEUE_STATE } from 'zss/feature/mediaqueue/queue'
import {
  medialistflaglines,
  mediaqueueflaglines,
} from 'zss/firmware/loader/mediaqueueflags'

function emptystate(): MEDIAQUEUE_STATE {
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
  }
}

describe('loader media queue flags', () => {
  it('formats approval rows and drops non-ascii', () => {
    const state = emptystate()
    state.pendingurls = ['https://example.com/a', 'https://example.com/b']
    state.pendingnames = ['goldbuick', '']
    state.pendingtitles = ['clip one', 'título']
    state.pendingdurations = [180, 0]
    expect(mediaqueueflaglines(state)).toEqual([
      '0 3m goldbuick clip one',
      '1 unknown ? ttulo',
    ])
  })

  it('formats the play queue without a duration', () => {
    const state = emptystate()
    state.urls = ['https://example.com/a']
    state.names = ['ada']
    state.titles = ['']
    expect(medialistflaglines(state)).toEqual([
      '0 ada https://example.com/a',
    ])
  })
})
