import { apierror } from 'zss/device/api'
import {
  mediacanmanagequeue,
  mediapayloadwithmanage,
} from 'zss/feature/mediaqueue/mediaguards'
import {
  memoryapplypermissionconfig,
  memorysetplayertotoken,
  memorysetrolefortoken,
} from 'zss/memory/permissions'

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
    })
    expect(mockapierror).not.toHaveBeenCalled()
  })

  it('mediapayloadwithmanage sets canmanage for bridge role', () => {
    memorysetplayertotoken('mod1', 'token-mod')
    memorysetrolefortoken('token-mod', 'mod')
    expect(mediacanmanagequeue('mod1')).toBe(true)
    expect(mediapayloadwithmanage('mod1')).toEqual({ canmanage: true })
    expect(mockapierror).not.toHaveBeenCalled()
  })
})
