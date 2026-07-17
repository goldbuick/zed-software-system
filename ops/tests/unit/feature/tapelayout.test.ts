jest.mock('zss/feature/durable', () => ({
  durableget: jest.fn(),
  durableset: jest.fn().mockResolvedValue(undefined),
}))

import { terminalinclayout } from 'zss/device/register/helpers/layout'
import { durableget, durableset } from 'zss/feature/durable'
import {
  hydratetapelayoutby,
  readtapelayoutmodality,
  synctapeactivelayout,
  validatetapelayoutby,
  writetapelayoutslot,
} from 'zss/feature/tapelayout'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

const mockdurableget = durableget as jest.MockedFunction<typeof durableget>
const mockdurableset = durableset as jest.MockedFunction<typeof durableset>

describe('tapelayout', () => {
  beforeEach(() => {
    useTape.getState().reset()
    mockdurableget.mockReset()
    mockdurableset.mockReset()
    mockdurableset.mockResolvedValue(undefined)
  })

  describe('validatetapelayoutby', () => {
    it('fills defaults for missing or invalid values', () => {
      expect(validatetapelayoutby(undefined)).toEqual({
        quick: TAPE_DISPLAY.TOP,
        cli: TAPE_DISPLAY.TOP,
        editor: TAPE_DISPLAY.TOP,
      })
      expect(
        validatetapelayoutby({
          quick: TAPE_DISPLAY.FULL,
          cli: 99,
          editor: TAPE_DISPLAY.BOTTOM,
        }),
      ).toEqual({
        quick: TAPE_DISPLAY.FULL,
        cli: TAPE_DISPLAY.TOP,
        editor: TAPE_DISPLAY.BOTTOM,
      })
    })
  })

  describe('readtapelayoutmodality', () => {
    it('prefers editor over quick and cli', () => {
      useTape.setState({
        terminalmode: 'quick',
        editor: {
          open: true,
          book: '',
          path: [],
          type: '',
          title: '',
        },
      })
      expect(readtapelayoutmodality()).toBe('editor')
    })

    it('returns quick when not in editor', () => {
      useTape.setState({ terminalmode: 'quick' })
      expect(readtapelayoutmodality()).toBe('quick')
    })

    it('returns cli by default', () => {
      expect(readtapelayoutmodality()).toBe('cli')
    })
  })

  describe('writetapelayoutslot / terminalinclayout', () => {
    it('cycles only the active modality and persists', () => {
      useTape.setState({
        layoutby: {
          quick: TAPE_DISPLAY.TOP,
          cli: TAPE_DISPLAY.FULL,
          editor: TAPE_DISPLAY.BOTTOM,
        },
        layout: TAPE_DISPLAY.FULL,
        terminalmode: 'cli',
      })
      terminalinclayout(true)
      const state = useTape.getState()
      expect(state.layoutby.cli).toBe(TAPE_DISPLAY.BOTTOM)
      expect(state.layoutby.quick).toBe(TAPE_DISPLAY.TOP)
      expect(state.layoutby.editor).toBe(TAPE_DISPLAY.BOTTOM)
      expect(state.layout).toBe(TAPE_DISPLAY.BOTTOM)
      expect(mockdurableset).toHaveBeenCalledWith('tapelayoutby', state.layoutby)
    })

    it('writes a named slot without changing other modalities', () => {
      writetapelayoutslot('quick', TAPE_DISPLAY.FULL)
      const state = useTape.getState()
      expect(state.layoutby.quick).toBe(TAPE_DISPLAY.FULL)
      expect(state.layoutby.cli).toBe(TAPE_DISPLAY.TOP)
      expect(state.layout).toBe(TAPE_DISPLAY.TOP)
      expect(mockdurableset).toHaveBeenCalled()
    })
  })

  describe('synctapeactivelayout', () => {
    it('applies quick slot when entering quick mode', () => {
      useTape.setState({
        layoutby: {
          quick: TAPE_DISPLAY.BOTTOM,
          cli: TAPE_DISPLAY.FULL,
          editor: TAPE_DISPLAY.TOP,
        },
        layout: TAPE_DISPLAY.FULL,
        terminalmode: 'cli',
      })
      useTape.setState({ terminalmode: 'quick' })
      synctapeactivelayout()
      expect(useTape.getState().layout).toBe(TAPE_DISPLAY.BOTTOM)
      expect(useTape.getState().layoutby.cli).toBe(TAPE_DISPLAY.FULL)
    })

    it('restores cli slot when leaving quick mode', () => {
      useTape.setState({
        layoutby: {
          quick: TAPE_DISPLAY.BOTTOM,
          cli: TAPE_DISPLAY.FULL,
          editor: TAPE_DISPLAY.TOP,
        },
        layout: TAPE_DISPLAY.BOTTOM,
        terminalmode: 'quick',
      })
      useTape.setState({ terminalmode: 'cli' })
      synctapeactivelayout()
      expect(useTape.getState().layout).toBe(TAPE_DISPLAY.FULL)
    })
  })

  describe('hydratetapelayoutby', () => {
    it('loads durable slots into zustand', async () => {
      mockdurableget.mockResolvedValue({
        quick: TAPE_DISPLAY.BOTTOM,
        cli: TAPE_DISPLAY.FULL,
        editor: TAPE_DISPLAY.BOTTOM,
      })
      await hydratetapelayoutby()
      const state = useTape.getState()
      expect(state.layoutby).toEqual({
        quick: TAPE_DISPLAY.BOTTOM,
        cli: TAPE_DISPLAY.FULL,
        editor: TAPE_DISPLAY.BOTTOM,
      })
      expect(state.layout).toBe(TAPE_DISPLAY.FULL)
    })
  })
})
