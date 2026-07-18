import { createdevice, createmessage } from 'zss/device'
import { hub } from 'zss/hub'

describe('hub BroadcastChannel', () => {
  afterEach(() => {
    hub.leave()
  })

  it('join and leave are idempotent', () => {
    hub.join('sess-a')
    hub.join('sess-a')
    hub.leave()
    hub.leave()
  })

  it('delivers local emit to matching devices', () => {
    const onmessage = jest.fn()
    const device = createdevice('testdev', [], onmessage, 'sess-a')
    hub.join('sess-a')
    device.emit('p1', 'testdev:ping', 1)
    expect(onmessage).toHaveBeenCalled()
    const msg = onmessage.mock.calls[0][0]
    expect(msg.target).toBe('ping')
    expect(msg.data).toBe(1)
    device.disconnect()
  })

  it('dedupes by message id', () => {
    const onmessage = jest.fn()
    const device = createdevice('testdev', ['log'], onmessage, 'sess-a')
    hub.join('sess-a')
    const msg = createmessage('sess-a', 'p', 'x', 'log', 'hi')
    hub.invoke(msg)
    hub.invoke(msg)
    expect(onmessage).toHaveBeenCalledTimes(1)
    device.disconnect()
  })

  it('does not publish ticktock on the channel', () => {
    hub.join('sess-tick')
    const received: string[] = []
    const peer = new BroadcastChannel('zss:sess-tick')
    peer.onmessage = (event) => {
      received.push(event.data?.target)
    }
    const msg = createmessage('sess-tick', '', 'clock', 'ticktock', 1)
    hub.invoke(msg)
    // allow macrotask for BroadcastChannel delivery
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).not.toContain('ticktock')
        peer.close()
        resolve()
      }, 20)
    })
  })

  it('publishes second on the channel', () => {
    hub.join('sess-second')
    const received: string[] = []
    const peer = new BroadcastChannel('zss:sess-second')
    peer.onmessage = (event) => {
      received.push(event.data?.target)
    }
    const msg = createmessage('sess-second', '', 'clock', 'second', 1)
    hub.invoke(msg)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toContain('second')
        peer.close()
        resolve()
      }, 20)
    })
  })

  it('invokelocal does not publish', () => {
    hub.join('sess-local')
    const received: string[] = []
    const peer = new BroadcastChannel('zss:sess-local')
    peer.onmessage = (event) => {
      received.push(event.data?.target)
    }
    const onmessage = jest.fn()
    const device = createdevice('testdev', ['log'], onmessage, 'sess-local')
    hub.invokelocal(createmessage('sess-local', 'p', 'x', 'log', 'x'))
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(onmessage).toHaveBeenCalledTimes(1)
        expect(received).toEqual([])
        peer.close()
        device.disconnect()
        resolve()
      }, 20)
    })
  })
})
