import {
  BROADCAST_HEAD_KEYWORDS,
  BROADCAST_WHIP_ALIASES,
  PIVOT_SHEAR_KEYWORDS,
} from 'zss/firmware/autocompleteconstants'
import { TRANSFORM_FIRMWARE } from 'zss/firmware/transforms'
import { keywordsforcommandargcomplete } from 'zss/screens/tape/argcomplete'

describe('broadcast argmeta shape', () => {
  it('resolves stop/whip and whip aliases via whenfirst', () => {
    const meta = {
      byposition: [[...BROADCAST_HEAD_KEYWORDS]],
      whenfirst: {
        whip: [[], [...BROADCAST_WHIP_ALIASES]],
      },
    }
    expect(keywordsforcommandargcomplete(meta, 0, '')).toEqual([
      'stop',
      'whip',
    ])
    expect(keywordsforcommandargcomplete(meta, 1, 'whip')).toEqual([
      'twitch',
      'ivs',
    ])
  })
})

describe('pivot argmeta', () => {
  it('suggests shear keywords after degrees', () => {
    const meta = TRANSFORM_FIRMWARE.getcommandargmeta('pivot')
    expect(meta?.byposition?.[0]).toEqual([])
    expect(meta?.byposition?.[1]).toEqual([...PIVOT_SHEAR_KEYWORDS])
  })
})
