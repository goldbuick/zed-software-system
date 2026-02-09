import {
  TAPE_DISPLAY,
  TAPE_MAX_LINES,
  useEditor,
  useGadgetClient,
  useInspector,
  useTape,
  useTerminal,
} from 'zss/gadget/data/state'

describe('state', () => {
  // Note: useEqual is a React hook that uses useRef and cannot be tested
  // in a Node.js environment without React Testing Library. It should be
  // tested in integration tests with React components.

  describe('useGadgetClient', () => {
    it('should have initial state', () => {
      const state = useGadgetClient.getState()
      expect(state.desync).toBe(false)
      expect(state.gadget.id).toBe('')
      expect(state.gadget.board).toBe('')
      expect(state.gadget.layers).toEqual([])
      expect(state.zsswords.cli).toEqual([])
      expect(state.layercache).toEqual({})
      expect(state.slim).toEqual([])
    })

    it('should update state', () => {
      useGadgetClient.setState({ desync: true })
      expect(useGadgetClient.getState().desync).toBe(true)

      // Reset
      useGadgetClient.setState({ desync: false })
    })

    it('should update gadget state', () => {
      const newGadget = {
        id: 'test-id',
        board: 'test-board',
        exiteast: '',
        exitwest: '',
        exitnorth: '',
        exitsouth: '',
        layers: [],
        tickers: [],
        scrollname: '',
        scroll: [],
        sidebar: [],
      }

      useGadgetClient.setState({ gadget: newGadget })
      const state = useGadgetClient.getState()
      expect(state.gadget.id).toBe('test-id')
      expect(state.gadget.board).toBe('test-board')

      // Reset
      useGadgetClient.setState({
        gadget: {
          id: '',
          board: '',
          exiteast: '',
          exitwest: '',
          exitnorth: '',
          exitsouth: '',
          layers: [],
          tickers: [],
          scrollname: '',
          scroll: [],
          sidebar: [],
        },
      })
    })
  })

  describe('useTape', () => {
    it('should have initial state', () => {
      const state = useTape.getState()
      expect(state.layout).toBe(TAPE_DISPLAY.TOP)
      expect(state.inspector).toBe(false)
      expect(state.quickterminal).toBe(false)
      expect(state.toast).toBe('')
      expect(state.terminal.open).toBe(true)
      expect(state.terminal.logs).toEqual([])
      expect(state.editor.open).toBe(false)
      expect(state.editor.book).toBe('')
      expect(state.editor.path).toEqual([])
    })

    it('should update state', () => {
      useTape.setState({ layout: TAPE_DISPLAY.FULL })
      expect(useTape.getState().layout).toBe(TAPE_DISPLAY.FULL)

      useTape.setState({ toast: 'Test toast' })
      expect(useTape.getState().toast).toBe('Test toast')

      // Reset
      useTape.getState().reset()
      expect(useTape.getState().layout).toBe(TAPE_DISPLAY.TOP)
      expect(useTape.getState().toast).toBe('')
    })

    it('should reset to initial state', () => {
      useTape.setState({
        layout: TAPE_DISPLAY.BOTTOM,
        inspector: true,
        quickterminal: true,
        toast: 'Test',
        terminal: { open: false, logs: ['log1'] },
        editor: {
          open: true,
          book: 'book1',
          path: ['path1'],
          type: 'type1',
          title: 'title1',
        },
      })

      useTape.getState().reset()

      const state = useTape.getState()
      expect(state.layout).toBe(TAPE_DISPLAY.TOP)
      expect(state.inspector).toBe(false)
      expect(state.quickterminal).toBe(false)
      expect(state.toast).toBe('')
      expect(state.terminal.open).toBe(true)
      expect(state.terminal.logs).toEqual([])
      expect(state.editor.open).toBe(false)
      expect(state.editor.book).toBe('')
      expect(state.editor.path).toEqual([])
    })
  })

  describe('useTapeTerminal', () => {
    it('should have initial state', () => {
      const state = useTerminal.getState()
      expect(state.scroll).toBe(0)
      expect(state.xcursor).toBe(0)
      expect(state.ycursor).toBe(0)
      expect(state.xselect).toBeUndefined()
      expect(state.yselect).toBeUndefined()
      expect(state.bufferindex).toBe(0)
      expect(state.buffer).toEqual([''])
    })

    it('should update state', () => {
      useTerminal.setState({ scroll: 10, xcursor: 5, ycursor: 3 })
      const state = useTerminal.getState()
      expect(state.scroll).toBe(10)
      expect(state.xcursor).toBe(5)
      expect(state.ycursor).toBe(3)

      // Reset
      useTerminal.getState().reset()
    })

    it('should reset to initial state', () => {
      useTerminal.setState({
        scroll: 100,
        xcursor: 50,
        ycursor: 25,
        xselect: 10,
        yselect: 20,
        bufferindex: 5,
        buffer: ['cmd1', 'cmd2', 'cmd3'],
      })

      useTerminal.getState().reset()

      const state = useTerminal.getState()
      expect(state.scroll).toBe(0)
      expect(state.xcursor).toBe(0)
      expect(state.ycursor).toBe(0)
      expect(state.xselect).toBeUndefined()
      expect(state.yselect).toBeUndefined()
      expect(state.bufferindex).toBe(0)
      expect(state.buffer).toEqual([''])
    })
  })

  describe('useTapeEditor', () => {
    it('should have initial state', () => {
      const state = useEditor.getState()
      expect(state.xscroll).toBe(0)
      expect(state.yscroll).toBe(0)
      expect(state.cursor).toBe(0)
      expect(state.select).toBeUndefined()
    })

    it('should update state', () => {
      useEditor.setState({ xscroll: 10, yscroll: 20, cursor: 5 })
      const state = useEditor.getState()
      expect(state.xscroll).toBe(10)
      expect(state.yscroll).toBe(20)
      expect(state.cursor).toBe(5)

      // Reset
      useEditor.getState().reset()
    })

    it('should reset to initial state', () => {
      useEditor.setState({
        xscroll: 100,
        yscroll: 200,
        cursor: 50,
        select: 25,
      })

      useEditor.getState().reset()

      const state = useEditor.getState()
      expect(state.xscroll).toBe(0)
      expect(state.yscroll).toBe(0)
      expect(state.cursor).toBe(0)
      expect(state.select).toBeUndefined()
    })
  })

  describe('useTapeInspector', () => {
    it('should have initial state', () => {
      const state = useInspector.getState()
      expect(state.pts).toEqual([])
      expect(state.cursor).toBeUndefined()
      expect(state.select).toBeUndefined()
    })

    it('should update state', () => {
      const pts = [
        [0, 0],
        [1, 1],
      ] as any
      useInspector.setState({ pts, cursor: 0, select: 1 })
      const state = useInspector.getState()
      expect(state.pts).toEqual(pts)
      expect(state.cursor).toBe(0)
      expect(state.select).toBe(1)

      // Reset
      useInspector.getState().reset()
    })

    it('should reset to initial state', () => {
      const pts = [
        [0, 0],
        [1, 1],
        [2, 2],
      ] as any
      useInspector.setState({ pts, cursor: 1, select: 2 })

      useInspector.getState().reset()

      const state = useInspector.getState()
      expect(state.pts).toEqual([])
      expect(state.cursor).toBeUndefined()
      expect(state.select).toBeUndefined()
    })
  })

  describe('constants', () => {
    it('should have TAPE_MAX_LINES constant', () => {
      expect(TAPE_MAX_LINES).toBe(256)
    })

    it('should have TAPE_DISPLAY enum values', () => {
      expect(TAPE_DISPLAY.TOP).toBe(0)
      expect(TAPE_DISPLAY.FULL).toBe(1)
      expect(TAPE_DISPLAY.BOTTOM).toBe(2)
      expect(TAPE_DISPLAY.SPLIT_X).toBe(3)
      expect(TAPE_DISPLAY.MAX).toBe(4)
    })
  })
})
