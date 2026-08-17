import { apierror } from 'zss/device/api'
import {
  mediacanmanagequeue,
  mediapayloadwithmanage,
  mediareaddisplaynamefrompayload,
} from 'zss/feature/mediaqueue/mediaguards'
import {
  memorycreatebook,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memoryapplypermissionconfig,
  memorysetplayertotoken,
  memorysetrolefortoken,
} from 'zss/memory/permissions'
import {
  memoryresetbooks,
  memorywritesoftwarebook,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
}))

const mockapierror = apierror as jest.Mock

describe('mediaguards', () => {
  beforeEach(() => {
    mockapierror.mockClear()
    memoryapplypermissionconfig('creative')
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

  it('mediareaddisplaynamefrompayload rejects a payload without a name', () => {
    expect(mediareaddisplaynamefrompayload({ canmanage: true })).toBe('')
    expect(mediareaddisplaynamefrompayload(undefined)).toBe('')
    expect(mediareaddisplaynamefrompayload({ displayname: ' zed ' })).toBe('zed')
  })
})
