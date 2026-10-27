import { armclipboardtext } from 'zss/feature/keyboard'

type CLIP_ITEM = {
  items: Record<string, Promise<Blob>>
}

describe('armclipboardtext', () => {
  const prioritem = (globalThis as { ClipboardItem?: unknown }).ClipboardItem
  const hadnavigator = 'navigator' in globalThis
  const priornavigator = globalThis.navigator

  afterEach(() => {
    ;(globalThis as { ClipboardItem?: unknown }).ClipboardItem = prioritem
    if (hadnavigator) {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: priornavigator,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'navigator')
    }
  })

  it('resolves the blob with the url', async () => {
    const writes: CLIP_ITEM[] = []
    class FakeItem {
      items: Record<string, Promise<Blob>>
      constructor(items: Record<string, Promise<Blob>>) {
        this.items = items
      }
    }
    ;(globalThis as { ClipboardItem?: unknown }).ClipboardItem = FakeItem
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          write: (items: CLIP_ITEM[]) => {
            writes.push(...items)
            return Promise.resolve()
          },
        },
      },
    })

    const armed = armclipboardtext()
    expect(armed?.settle).toEqual(expect.any(Function))
    armed!.settle('https://zed.cafe/join/#abc')
    await armed!.written
    const blob = await writes[0].items['text/plain']
    expect(await blob.text()).toBe('https://zed.cafe/join/#abc')
  })

  it('skips when ClipboardItem is missing', () => {
    ;(globalThis as { ClipboardItem?: unknown }).ClipboardItem = undefined
    const write = jest.fn()
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          write,
        },
      },
    })

    expect(armclipboardtext()).toBeUndefined()
    expect(write).not.toHaveBeenCalled()
  })
})
