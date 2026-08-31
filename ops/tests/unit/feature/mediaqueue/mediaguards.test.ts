import { apierror } from 'zss/device/api'
import {
  mediacanmanagequeue,
  mediapayloadwithboardhelper,
  mediapayloadwithmanage,
  mediareadhelperpeeridfrompayload,
  mediareaddisplaynamefrompayload,
  mediarequireboardhelper,
} from 'zss/feature/mediaqueue/mediaguards'
import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreatebook,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import {
  memoryapplypermissionconfig,
  memorysetplayertotoken,
  memorysetrolefortoken,
} from 'zss/memory/permissions'
import { memoryensureboardruntime } from 'zss/memory/runtimeboundary'
import { memoryresetbooks, memorywritesoftwarebook } from 'zss/memory/session'
import { CODE_PAGE_TYPE, MEMORY_LABEL } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

const mockapierror = apierror as jest.Mock

describe('mediaguards', () => {
  beforeEach(() => {
    mockapierror.mockClear()
    memoryapplypermissionconfig('creative')
  })

  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  it('mediapayloadwithmanage does not deny speaker-only players', () => {
    memorysetplayertotoken('player1', 'token-a')
    memorysetrolefortoken('token-a', 'player')
    expect(mediacanmanagequeue('player1')).toBe(false)
    expect(
      mediapayloadwithmanage('player1', { url: 'https://example.com/v' }),
    ).toEqual({
      url: 'https://example.com/v',
      canmanage: false,
      displayname: 'player',
    })
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('mediapayloadwithmanage sets canmanage for bridge role', () => {
    memorysetplayertotoken('mod1', 'token-mod')
    memorysetrolefortoken('token-mod', 'mod')
    expect(mediacanmanagequeue('mod1')).toBe(true)
    expect(mediapayloadwithmanage('mod1')).toEqual({
      canmanage: true,
      displayname: 'player',
    })
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('mediapayloadwithmanage carries the user flag as the submitter name', () => {
    const book = memorycreatebook([])
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, book.id)
    memorywritebookflag(book, 'namedplayer', 'user', 'goldbuick')
    expect(mediapayloadwithmanage('namedplayer')).toEqual({
      canmanage: false,
      displayname: 'goldbuick',
    })
  })

  it('mediapayloadwithmanage honors explicit displayname over player flag', () => {
    const book = memorycreatebook([])
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, book.id)
    memorywritebookflag(book, 'namedplayer', 'user', 'goldbuick')
    expect(
      mediapayloadwithmanage('namedplayer', { displayname: 'twitchfan' }),
    ).toEqual({
      displayname: 'twitchfan',
      canmanage: false,
    })
    expect(
      mediapayloadwithmanage('namedplayer', {
        displayname: 'bad:name\nline',
      }),
    ).toEqual({
      displayname: 'badnameline',
      canmanage: false,
    })
    expect(
      mediapayloadwithmanage('namedplayer', { displayname: '   ' }),
    ).toEqual({
      displayname: 'player',
      canmanage: false,
    })
  })

  it('mediareaddisplaynamefrompayload rejects a payload without a name', () => {
    expect(mediareaddisplaynamefrompayload({ canmanage: true })).toBe('')
    expect(mediareaddisplaynamefrompayload(undefined)).toBe('')
    expect(mediareaddisplaynamefrompayload({ displayname: ' zed ' })).toBe(
      'zed',
    )
  })

  it('mediareadhelperpeeridfrompayload reads the stamped helper id', () => {
    expect(mediareadhelperpeeridfrompayload(undefined)).toBe('')
    expect(mediareadhelperpeeridfrompayload({ helperpeerid: ' mq_ab ' })).toBe(
      'mq_ab',
    )
  })

  it('mediapayloadwithboardhelper uses current board runtime helper', () => {
    const boarda = memorycreatecodepage('@board bound\n', {})
    const boardb = memorycreatecodepage('@board other\n', {})
    const book = memorycreatebook([boarda, boardb])
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, book.id)
    const bound = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boarda)!
    const other = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardb)!
    bound.id = boarda.id
    other.id = boardb.id
    memoryensureboardruntime(bound).mediaqueuehelperpeerid = 'mq_helper1'
    memorywritebookflag(book, 'p1', 'board', bound.id)
    memorywritebookflag(book, 'p1', 'user', 'goldbuick')
    expect(mediarequireboardhelper('p1')).toBe('mq_helper1')
    expect(
      mediapayloadwithboardhelper('p1', { url: 'https://a.example' }),
    ).toEqual({
      url: 'https://a.example',
      helperpeerid: 'mq_helper1',
      boardid: bound.id,
      canmanage: false,
      displayname: 'goldbuick',
    })
    memorywritebookflag(book, 'p1', 'board', other.id)
    expect(mediarequireboardhelper('p1')).toBe('')
    expect(mediapayloadwithboardhelper('p1')).toBeUndefined()
    expect(mockapierror).toHaveBeenCalledWith(
      expect.anything(),
      'p1',
      'media',
      'not on a board with media',
    )
  })

  it('mediapayloadwithboardhelper prefers READ_CONTEXT.board over player board', () => {
    const boarda = memorycreatecodepage('@board bound\n', {})
    const boardb = memorycreatecodepage('@board other\n', {})
    const book = memorycreatebook([boarda, boardb])
    memoryresetbooks([book])
    memorywritesoftwarebook(MEMORY_LABEL.MAIN, book.id)
    const bound = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boarda)!
    const other = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardb)!
    bound.id = boarda.id
    other.id = boardb.id
    memoryensureboardruntime(bound).mediaqueuehelperpeerid = 'mq_from_context'
    memorywritebookflag(book, 'p1', 'board', other.id)
    const previous = READ_CONTEXT.board
    READ_CONTEXT.board = bound
    try {
      expect(mediarequireboardhelper('p1')).toBe('mq_from_context')
      expect(
        mediapayloadwithboardhelper('p1', { url: 'https://b.example' }),
      ).toEqual({
        url: 'https://b.example',
        helperpeerid: 'mq_from_context',
        boardid: bound.id,
        canmanage: false,
        displayname: 'player',
      })
    } finally {
      READ_CONTEXT.board = previous
    }
  })
})
