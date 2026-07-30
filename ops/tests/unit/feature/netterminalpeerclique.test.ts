import { createmessage } from 'zss/device'
import { shouldforwardservertoclient } from 'zss/device/forward'
import {
  NETTERMINAL_MAX_JOINS,
  resolvejoinroute,
  shoulddialpeer,
  shouldforwardonjoinedge,
} from 'zss/feature/netterminalpeerclique'

describe('netterminal peer clique helpers', () => {
  it('NETTERMINAL_MAX_JOINS is 10', () => {
    expect(NETTERMINAL_MAX_JOINS).toBe(10)
  })

  it('shoulddialpeer: lower peer id dials higher', () => {
    expect(shoulddialpeer('aaa', 'bbb')).toBe(true)
    expect(shoulddialpeer('bbb', 'aaa')).toBe(false)
    expect(shoulddialpeer('same', 'same')).toBe(false)
    expect(shoulddialpeer('', 'bbb')).toBe(false)
  })

  it('shouldforwardonjoinedge allows boardrunner and chip only', () => {
    expect(
      shouldforwardonjoinedge(
        createmessage('s', 'p', 'x', 'boardrunner:input'),
      ),
    ).toBe(true)
    expect(
      shouldforwardonjoinedge(createmessage('s', 'p', 'x', 'chip:scroll')),
    ).toBe(true)
    expect(
      shouldforwardonjoinedge(createmessage('s', 'p', 'x', 'second')),
    ).toBe(false)
    expect(
      shouldforwardonjoinedge(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(false)
    expect(
      shouldforwardonjoinedge(createmessage('s', 'p', 'x', 'vm:cli')),
    ).toBe(false)
  })

  it('shouldforwardservertoclient allows netterminal roster path', () => {
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'netterminal:peerroster'),
      ),
    ).toBe(true)
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'netterminal:runnmap'),
      ),
    ).toBe(true)
  })

  it('resolvejoinroute prefers direct when join edge open', () => {
    const openjoinpeers = new Set(['peer-runner'])
    const route = resolvejoinroute({
      message: createmessage('s', 'player-b', 'x', 'boardrunner:input'),
      selfpeerid: 'peer-b',
      hostpeerid: 'peer-host',
      playertopeer: {
        'player-b': 'peer-b',
        'player-a': 'peer-runner',
        host: 'peer-host',
      },
      boardtorunner: { board1: 'player-a' },
      playertoboard: { 'player-b': 'board1' },
      openjoinpeers,
    })
    expect(route).toEqual({ kind: 'direct', peerid: 'peer-runner' })
  })

  it('resolvejoinroute falls back to star when edge down', () => {
    const route = resolvejoinroute({
      message: createmessage('s', 'player-b', 'x', 'boardrunner:input'),
      selfpeerid: 'peer-b',
      hostpeerid: 'peer-host',
      playertopeer: {
        'player-b': 'peer-b',
        'player-a': 'peer-runner',
      },
      boardtorunner: { board1: 'player-a' },
      playertoboard: { 'player-b': 'board1' },
      openjoinpeers: new Set(),
    })
    expect(route).toEqual({ kind: 'star' })
  })

  it('resolvejoinroute is local when self is runner', () => {
    const route = resolvejoinroute({
      message: createmessage('s', 'player-a', 'x', 'boardrunner:input'),
      selfpeerid: 'peer-a',
      hostpeerid: 'peer-host',
      playertopeer: { 'player-a': 'peer-a' },
      boardtorunner: { board1: 'player-a' },
      playertoboard: { 'player-a': 'board1' },
      openjoinpeers: new Set(),
    })
    expect(route).toEqual({ kind: 'local' })
  })

  it('resolvejoinroute uses star when runner is host', () => {
    const route = resolvejoinroute({
      message: createmessage('s', 'player-b', 'x', 'chip:x'),
      selfpeerid: 'peer-b',
      hostpeerid: 'peer-host',
      playertopeer: {
        'player-b': 'peer-b',
        'player-host': 'peer-host',
      },
      boardtorunner: { board1: 'player-host' },
      playertoboard: { 'player-b': 'board1' },
      openjoinpeers: new Set(['peer-other']),
    })
    expect(route).toEqual({ kind: 'star' })
  })

  it('resolvejoinroute stars when board map missing', () => {
    const route = resolvejoinroute({
      message: createmessage('s', 'player-b', 'x', 'boardrunner:tick'),
      selfpeerid: 'peer-b',
      hostpeerid: 'peer-host',
      playertopeer: { 'player-b': 'peer-b' },
      boardtorunner: {},
      playertoboard: {},
      openjoinpeers: new Set(['peer-runner']),
    })
    expect(route).toEqual({ kind: 'star' })
  })
})
