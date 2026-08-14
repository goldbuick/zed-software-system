import {
  mediaqueueadd,
  mediaqueueclear,
  mediaqueuecurrenturl,
  mediaqueuenext,
  mediaqueuereadstate,
  mediaqueuesetindex,
} from 'zss/feature/mediaqueue/queue'
import {
  MEDIAQUEUE_PROTOCOL,
  ismediaqueuemessage,
} from 'zss/feature/mediaqueue/protocol'
import { MEDIAQUEUE_HEAD_KEYWORDS } from 'zss/firmware/autocompleteconstants'
import { keywordsforcommandargcomplete } from 'zss/screens/tape/argcomplete'

describe('mediaqueue queue', () => {
  beforeEach(() => {
    mediaqueueclear()
  })

  it('adds urls and advances with next', () => {
    mediaqueueadd('https://a.example')
    mediaqueueadd('https://b.example')
    expect(mediaqueuereadstate()).toEqual({
      urls: ['https://a.example', 'https://b.example'],
      index: 0,
    })
    expect(mediaqueuecurrenturl()).toBe('https://a.example')
    mediaqueuenext()
    expect(mediaqueuecurrenturl()).toBe('https://b.example')
    mediaqueuenext()
    expect(mediaqueuecurrenturl()).toBe('https://a.example')
  })

  it('goto clamps index', () => {
    mediaqueueadd('https://a.example')
    mediaqueuesetindex(99)
    expect(mediaqueuereadstate().index).toBe(0)
  })
})

describe('mediaqueue protocol', () => {
  it('accepts known message types', () => {
    expect(
      ismediaqueuemessage({
        type: 'mediaqueue:hello',
        protocol: MEDIAQUEUE_PROTOCOL,
        role: 'helper',
        peerid: 'x',
      }),
    ).toBe(true)
    expect(ismediaqueuemessage({ type: 'nope' })).toBe(false)
    expect(ismediaqueuemessage(null)).toBe(false)
  })
})

describe('mediaqueue cli argmeta', () => {
  it('suggests head keywords', () => {
    const meta = {
      byposition: [[...MEDIAQUEUE_HEAD_KEYWORDS]],
      whenfirst: {
        add: [[], []],
        goto: [[], []],
      },
    }
    expect(keywordsforcommandargcomplete(meta, 0, '')).toEqual([
      ...MEDIAQUEUE_HEAD_KEYWORDS,
    ])
  })
})
