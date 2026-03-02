import {
  createdevice,
  createmessage,
  parsetarget,
} from 'zss/device'

describe('device', () => {
  describe('createmessage', () => {
    it('creates a message with required fields', () => {
      const msg = createmessage('s1', 'p1', 'sender1', 'target1')
      expect(msg.session).toBe('s1')
      expect(msg.player).toBe('p1')
      expect(msg.sender).toBe('sender1')
      expect(msg.target).toBe('target1')
      expect(typeof msg.id).toBe('string')
      expect(msg.id.length).toBeGreaterThan(0)
    })

    it('includes optional data when provided', () => {
      const data = { foo: 'bar' }
      const msg = createmessage('s', 'p', 'snd', 'tgt', data)
      expect(msg.data).toEqual(data)
    })
  })

  describe('parsetarget', () => {
    it('is re-exported from device', () => {
      expect(parsetarget('a:b')).toEqual({ target: 'a', path: 'b' })
      expect(parsetarget('ready')).toEqual({ target: 'self', path: 'ready' })
    })
  })

  describe('createdevice', () => {
    let device: ReturnType<typeof createdevice>

    afterEach(() => {
      device?.disconnect?.()
    })

    it('returns a device with expected shape', () => {
      const onMessage = jest.fn()
      device = createdevice('testdev', [], onMessage)

      expect(device.id()).toBeDefined()
      expect(device.name()).toBe('testdev')
      expect(device.topics()).toEqual([])
      expect(typeof device.emit).toBe('function')
      expect(typeof device.reply).toBe('function')
      expect(typeof device.replynext).toBe('function')
      expect(typeof device.handle).toBe('function')
      expect(typeof device.disconnect).toBe('function')
    })

    it('delivers broadcast "ready" to device with "ready" topic', () => {
      const onMessage = jest.fn()
      device = createdevice('testdev', ['ready'], onMessage)

      const msg = createmessage('sess123', '', 'vm', 'ready')
      device.handle(msg)

      expect(onMessage).toHaveBeenCalledTimes(1)
      expect(onMessage).toHaveBeenCalledWith(msg)
    })

    it('delivers broadcast "second" to device with "second" topic', () => {
      const onMessage = jest.fn()
      device = createdevice('testdev', ['second'], onMessage)

      const msg = createmessage('sess1', '', 'clock', 'second', 42)
      device.handle(msg)

      expect(onMessage).toHaveBeenCalledTimes(1)
      expect(onMessage).toHaveBeenCalledWith(msg)
    })

    it('delivers directed message to device by name', () => {
      const onMessage = jest.fn()
      device = createdevice('mydevice', [], onMessage)

      const msg = createmessage('sess1', 'player1', 'register', 'mydevice:operator')
      device.handle(msg)

      expect(onMessage).toHaveBeenCalledTimes(1)
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          ...msg,
          target: 'operator',
        }),
      )
    })

    it('captures session from first "ready" broadcast', () => {
      const onMessage = jest.fn()
      device = createdevice('testdev', ['ready'], onMessage, '')

      expect(device.session()).toBe('')

      const msg = createmessage('sess-captured', '', 'vm', 'ready')
      device.handle(msg)

      expect(device.session()).toBe('sess-captured')
      expect(device.session(msg)).toBe('sess-captured')
    })

    it('resets session on sessionreset broadcast', () => {
      const onMessage = jest.fn()
      device = createdevice('testdev', ['ready', 'sessionreset'], onMessage)

      device.handle(createmessage('s1', '', 'x', 'ready'))
      expect(device.session()).toBe('s1')

      device.handle(createmessage('', '', 'x', 'sessionreset'))
      expect(device.session()).toBe('')
    })

    it('session check returns empty when message session does not match', () => {
      device = createdevice('testdev', ['ready'], jest.fn(), 'my-session')

      const wrongMsg = createmessage('wrong-session', '', 'x', 'ready')
      expect(device.session(wrongMsg)).toBe('')
      expect(device.session()).toBe('my-session')
    })
  })
})
