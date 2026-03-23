import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'

jest.mock('zss/device/api', () => ({
  registerbookmarkdelete: jest.fn(),
  registerbookmarkscroll: jest.fn(),
  registerbookmarkurlsave: jest.fn(),
}))
jest.mock('zss/memory/bookmarkscroll', () => ({
  memorybookmarkscroll: jest.fn(),
}))
jest.mock('zss/feature/bookmarks', () => ({
  normalizebookmarks: jest.fn((raw: unknown) => raw),
}))

import { handlebookmarkscrollpanel } from '../bookmarkscroll'

describe('handlebookmarkscrollpanel', () => {
  const vm = {} as DEVICE

  it('bookmarkurl sets location.href from message.data[0]', () => {
    const prev = globalThis.location
    const loc = { href: '' }
    Object.defineProperty(globalThis, 'location', {
      value: loc,
      configurable: true,
      writable: true,
    })
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: ['https://example.com/path'],
    }
    try {
      handlebookmarkscrollpanel(vm, message, 'bookmarkurl')
      expect(loc.href).toBe('https://example.com/path')
    } finally {
      Object.defineProperty(globalThis, 'location', {
        value: prev,
        configurable: true,
        writable: true,
      })
    }
  })

  it('bookmarkurl uses string data when not an array', () => {
    const prev = globalThis.location
    const loc = { href: '' }
    Object.defineProperty(globalThis, 'location', {
      value: loc,
      configurable: true,
      writable: true,
    })
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: 'https://a.test',
    }
    try {
      handlebookmarkscrollpanel(vm, message, 'bookmarkurl')
      expect(loc.href).toBe('https://a.test')
    } finally {
      Object.defineProperty(globalThis, 'location', {
        value: prev,
        configurable: true,
        writable: true,
      })
    }
  })

  it('bookmarkurl no-ops when href missing', () => {
    const prev = globalThis.location
    const loc = { href: 'unchanged' }
    Object.defineProperty(globalThis, 'location', {
      value: loc,
      configurable: true,
      writable: true,
    })
    const message: MESSAGE = {
      session: '',
      player: 'p1',
      id: 'id',
      sender: '',
      target: '',
      data: [],
    }
    try {
      handlebookmarkscrollpanel(vm, message, 'bookmarkurl')
      expect(loc.href).toBe('unchanged')
    } finally {
      Object.defineProperty(globalThis, 'location', {
        value: prev,
        configurable: true,
        writable: true,
      })
    }
  })
})
