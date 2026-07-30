import {
  memoryfspathsample,
  memoryfsloggingenabled,
} from 'zss/feature/memoryfs/log'
import { memorysetconfig, memorywriteconfig } from 'zss/memory/utilities'

describe('memoryfs log helpers', () => {
  afterEach(() => {
    memorywriteconfig('memoryfslogging', 'off')
  })

  it('memoryfspathsample truncates long lists', () => {
    const paths = Array.from({ length: 10 }, (_, i) => `p${i}.json`)
    const sample = memoryfspathsample(paths, 3)
    expect(sample).toBe(' p0.json p1.json p2.json +7 more')
  })

  it('memoryfsloggingenabled follows config', () => {
    expect(memoryfsloggingenabled()).toBe(false)
    memorysetconfig([['memoryfslogging', 'on']])
    expect(memoryfsloggingenabled()).toBe(true)
  })
})
