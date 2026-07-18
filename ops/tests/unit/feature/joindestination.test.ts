import {
  clearcrossloginflags,
  readcrossloginflags,
  setcrossloginflags,
  takecrossloginflags,
} from 'zss/feature/crosslogin'
import { joinstatuslinkdead } from 'zss/feature/joinstatusscroll'
import { sanitizeloginflags } from 'zss/feature/loginflags'
import { isjoindestination, parsejoindestination } from 'zss/feature/url'

jest.mock('zss/gadget/data/scrollwritelines', () => ({
  scrollwritelines: jest.fn(),
}))

import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

describe('parsejoindestination', () => {
  it('parses bare zns peer host path', () => {
    expect(parsejoindestination('wil.at.zed.cafe/peer')).toEqual({
      kind: 'znspeer',
      namespace: 'wil',
      raw: 'wil.at.zed.cafe/peer',
    })
  })

  it('parses https zns peer url', () => {
    expect(parsejoindestination('https://wil.at.zed.cafe/peer')).toEqual({
      kind: 'znspeer',
      namespace: 'wil',
      raw: 'https://wil.at.zed.cafe/peer',
    })
  })

  it('parses cafe join hash url', () => {
    expect(parsejoindestination('https://zed.cafe/join/#AbCd_12')).toEqual({
      kind: 'joinhash',
      peerid: 'AbCd_12',
      raw: 'https://zed.cafe/join/#AbCd_12',
    })
  })

  it('rejects board names', () => {
    expect(parsejoindestination('title')).toBeUndefined()
    expect(parsejoindestination('room1x0')).toBeUndefined()
    expect(isjoindestination('')).toBe(false)
  })
})

describe('crosslogin flags', () => {
  afterEach(() => {
    clearcrossloginflags()
  })

  it('stores and takes all flags once', () => {
    setcrossloginflags({ health: 100, ammo: 5, config_foo: 'x' })
    expect(readcrossloginflags()).toEqual({
      health: 100,
      ammo: 5,
      config_foo: 'x',
    })
    expect(takecrossloginflags()).toEqual({
      health: 100,
      ammo: 5,
      config_foo: 'x',
    })
    expect(takecrossloginflags()).toBeUndefined()
  })

  it('keeps player flags after sanitizeloginflags strips config keys', () => {
    const merged = sanitizeloginflags({
      health: 42,
      gems: 3,
      config_gadget: 'on',
    })
    expect(merged).toEqual({ health: 42, gems: 3 })
  })
})

describe('joinstatuslinkdead', () => {
  beforeEach(() => {
    jest.mocked(scrollwritelines).mockClear()
  })

  it('writes LINKDEAD into the joining scroll', () => {
    joinstatuslinkdead('player1', 'wil peer')
    expect(scrollwritelines).toHaveBeenCalledWith(
      'player1',
      'joining',
      '$redLINKDEAD\n$whitewil peer',
      'refscroll',
    )
  })
})
