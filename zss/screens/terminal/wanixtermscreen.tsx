import { useCallback, useEffect, useRef, useState } from 'react'
import { registerterminalclose, wanixservertermwrite } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  cyclewanixattachedsession,
  detachwanixterm,
  readattachedsession,
  subscribewanixattach,
} from 'zss/device/wanixclient/wanixdisplay'
import { readwanixsessionlabel } from 'zss/device/wanixclient/wanixsessionmeta'
import {
  readwanixtermbuffer,
  readwanixtermbufferkeys,
  readwanixtermnotifyversion,
  subscribewanixtermbuffer,
} from 'zss/device/wanixclient/wanixtermbuffer'
import type {
  WanixTermCellPos,
  WanixTermTileBuffer,
} from 'zss/device/wanixclient/state'
import {
  cellinwanixtermselection,
  extractwanixtermselectiontext,
  formatwanixtermpaste,
  haswanixtermselection,
  movewanixtermselection,
  readwanixtermguestcursor,
  readwanixtermlinecell,
} from 'zss/device/wanixclient/wanixtermclipboard'
import {
  readwanixtermscrollstate,
  scrollwanixtermby,
  scrollwanixtermto,
} from 'zss/device/wanixclient/wanixtermscroll'
import { withclipboard } from 'zss/feature/keyboard'
import { Scrollable } from 'zss/gadget/scrollable'
import { writetile } from 'zss/gadget/tiles'
import { modsfromevent } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { useWriteText } from 'zss/gadget/writetext'
import { ispresent } from 'zss/mapping/types'
import { cursorcellvalues } from 'zss/screens/inputcommon'
import { ScrollMarquee } from 'zss/screens/scroll/marquee'
import { ismac, metakey } from 'zss/words/system'
import { textformatreadedges } from 'zss/words/textformat'
import { COLOR, NAME } from 'zss/words/types'

const HINT_SCROLLBACK_ROWS = ismac ? `Fn+Up/Down` : `PgUp/PgDown`
const HINT_CLIPBOARD = ismac
  ? `shift+arrows select, ${metakey}+c/v`
  : `shift+arrows select, ctrl+shift+c/v`
const HINT_IDLE = `Ctrl+\\ open detach menu, Ctrl+Esc close tape, ${HINT_SCROLLBACK_ROWS}, ${HINT_CLIPBOARD}`
const HINT_ARMED = `Ctrl+\\ to detach, left/right to switch sessions`
const HINT_COLOR = COLOR.BLACK
const HINT_MARQUEE_GAP = '   ·   '

const SELECTION_ARROW_KEYS = new Set([
  'arrowleft',
  'arrowright',
  'arrowup',
  'arrowdown',
])

function useWanixAttachSessionKey() {
  const [sessionkey, setsessionkey] = useState(readattachedsession)
  useEffect(
    () => subscribewanixattach(() => setsessionkey(readattachedsession())),
    [],
  )
  return sessionkey
}

function useWanixTermBufferVersion() {
  const [version, setversion] = useState(readwanixtermnotifyversion)
  useEffect(
    () =>
      subscribewanixtermbuffer(() => setversion(readwanixtermnotifyversion())),
    [],
  )
  return version
}

function encodekeyboard(event: KeyboardEvent): string | null {
  const rawkey = event.key
  const key = rawkey.toLowerCase()
  if (event.ctrlKey && rawkey.length === 1) {
    const code = rawkey.toLowerCase().charCodeAt(0)
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(code - 96)
    }
    if (code >= 91 && code <= 95) {
      return String.fromCharCode(code - 64)
    }
  }
  switch (key) {
    case 'enter':
      return '\r'
    case 'backspace':
      return '\x7f'
    case 'delete':
      return '\x7f'
    case 'tab':
      return '\t'
    case 'arrowup':
      return '\x1b[A'
    case 'arrowdown':
      return '\x1b[B'
    case 'arrowright':
      return '\x1b[C'
    case 'arrowleft':
      return '\x1b[D'
    case 'escape':
      return '\x1b'
  }
  if (rawkey.length === 1 && !event.ctrlKey && !event.metaKey) {
    return rawkey
  }
  return null
}

function inverseselectioncellcolors(fg: number, bg: number) {
  let swapfg = fg >= 33 ? fg - 33 : fg
  if (swapfg > 15) {
    swapfg = swapfg % 16
  }
  let swapbg = bg
  if (swapbg >= Number(COLOR.ONBLACK) && swapbg <= Number(COLOR.ONWHITE)) {
    swapbg = swapbg - Number(COLOR.ONBLACK)
  }
  return { color: swapbg, bg: swapfg }
}

function isctrlbackslash(event: KeyboardEvent) {
  return event.ctrlKey && event.key === '\\'
}

function isctrlescape(event: KeyboardEvent) {
  return event.ctrlKey && NAME(event.key) === 'escape'
}

function closeattachedtape() {
  registerterminalclose(SOFTWARE, registerreadplayer())
}

function iscopyshortcut(event: KeyboardEvent, hasselection: boolean) {
  if (!hasselection) {
    return false
  }
  const key = NAME(event.key)
  if (key !== 'c') {
    return false
  }
  const mods = modsfromevent(event)
  if (mods.ctrl) {
    return true
  }
  if (!ismac && event.ctrlKey && event.shiftKey) {
    return true
  }
  if (event.ctrlKey && !event.shiftKey && !event.metaKey) {
    return true
  }
  return false
}

function ispasteshortcut(event: KeyboardEvent) {
  const key = NAME(event.key)
  const mods = modsfromevent(event)
  if (mods.ctrl && key === 'v') {
    return true
  }
  if (!ismac && event.ctrlKey && event.shiftKey && key === 'v') {
    return true
  }
  if (event.shiftKey && key === 'insert') {
    return true
  }
  return false
}

export function WanixTermScreen() {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const sessionkey = useWanixAttachSessionKey()
  useWanixTermBufferVersion()
  const lastframe = useRef<WanixTermTileBuffer | null>(null)
  const [scrolloffset, setscrolloffset] = useState(0)
  const [prefixarmed, setprefixarmed] = useState(false)
  const [selanchor, setselanchor] = useState<WanixTermCellPos | null>(null)
  const [selactive, setselactive] = useState<WanixTermCellPos | null>(null)
  const [hasnewoutput, sethasnewoutput] = useState(false)

  const atlivelineref = useRef(true)
  const sessionkeyref = useRef(sessionkey)
  const bracketedpasteref = useRef(false)
  const scrollversionref = useRef(0)

  const buffer = sessionkey != null ? readwanixtermbuffer(sessionkey) : null
  if (buffer) {
    lastframe.current = buffer
  }
  const frame = buffer ?? lastframe.current

  const clearsel = useCallback(() => {
    setselanchor(null)
    setselactive(null)
  }, [])

  useEffect(() => {
    setscrolloffset(0)
    setprefixarmed(false)
    sethasnewoutput(false)
    clearsel()
  }, [sessionkey, clearsel])

  useEffect(() => {
    if (!frame) {
      return
    }
    if (scrolloffset === 0) {
      sethasnewoutput(false)
      scrollversionref.current = frame.version
      return
    }
    if (frame.version > scrollversionref.current) {
      sethasnewoutput(true)
    }
  }, [frame?.version, scrolloffset, frame])

  const pastetext = useCallback((text: string) => {
    const targetkey = sessionkeyref.current ?? readattachedsession()
    if (!targetkey) {
      return
    }
    wanixservertermwrite(
      SOFTWARE,
      registerreadplayer(),
      formatwanixtermpaste(text, bracketedpasteref.current),
      targetkey,
    )
  }, [])

  useEffect(() => {
    function onpaste(event: ClipboardEvent) {
      if (!atlivelineref.current) {
        return
      }
      const text = event.clipboardData?.getData('text/plain')
      if (!ispresent(text) || text.length === 0) {
        return
      }
      event.preventDefault()
      pastetext(text)
    }
    document.addEventListener('paste', onpaste)
    return () => {
      document.removeEventListener('paste', onpaste)
    }
  }, [pastetext])

  if (!frame) {
    return null
  }

  const scrollbackrows = frame.scrollbackrows ?? 0
  const cols = Math.min(frame.cols, edge.width)
  const visibleheight = Math.max(0, edge.height - 1)
  const scrollstate = readwanixtermscrollstate(
    frame,
    visibleheight,
    scrolloffset,
  )
  const { maxoffset: maxscrolloffset, startline, atliveline } = scrollstate
  const hasselection = haswanixtermselection(selanchor, selactive)

  atlivelineref.current = atliveline
  sessionkeyref.current = sessionkey
  bracketedpasteref.current = frame.bracketedpaste ?? false

  for (let screeny = 0; screeny < visibleheight; screeny++) {
    const lineindex = startline + screeny
    for (let x = 0; x < cols; x++) {
      const drawx = edge.left + x
      const drawy = edge.top + screeny
      const cell = readwanixtermlinecell(frame, lineindex, x)
      let char = cell.char
      let color = cell.color
      let bg = cell.bg
      if (
        hasselection &&
        cellinwanixtermselection(lineindex, x, selanchor, selactive)
      ) {
        const inverted = inverseselectioncellcolors(color, bg)
        color = inverted.color
        bg = inverted.bg
      }
      if (
        atliveline &&
        frame.cursorvisible &&
        lineindex === scrollbackrows + frame.cursory &&
        x === frame.cursorx
      ) {
        const cursorcell = cursorcellvalues(char, color, bg)
        char = cursorcell.char
        color = cursorcell.color
        bg = cursorcell.bg
      }
      writetile(context, context.width, context.height, drawx, drawy, {
        char,
        color,
        bg,
      })
    }
  }

  let hintline = ''
  if (edge.height >= 1) {
    const sessions = readwanixtermbufferkeys()
    const sessioncount = sessions.length
    const sessionindex = sessions.indexOf(sessionkey ?? '')
    const label = sessionkey ? readwanixsessionlabel(sessionkey) : '?'
    const altbadge = frame.altactive ? ' alt' : ''
    const newoutputbadge = hasnewoutput ? ' new output' : ''
    const sessionhint = `${label} (${sessionindex + 1}/${sessioncount})${altbadge}${newoutputbadge}`
    hintline = `${prefixarmed ? HINT_ARMED : HINT_IDLE}, ${sessionhint}${HINT_MARQUEE_GAP}`
  }

  context.changed()

  function scrollby(delta: number) {
    setscrolloffset((prev) => scrollwanixtermby(prev, delta, maxscrolloffset))
  }

  function scrollto(target: 'top' | 'live') {
    setscrolloffset(scrollwanixtermto(scrolloffset, target, maxscrolloffset))
    if (target === 'live') {
      sethasnewoutput(false)
      scrollversionref.current = frame!.version
    }
  }

  function trycopy(event: KeyboardEvent) {
    if (!hasselection || selanchor == null || selactive == null) {
      return false
    }
    if (!iscopyshortcut(event, hasselection)) {
      return false
    }
    event.preventDefault()
    const text = extractwanixtermselectiontext(frame!, selanchor, selactive)
    const clipboard = withclipboard()
    if (ispresent(clipboard)) {
      void clipboard.writeText(text).catch((err) => console.error(err))
    }
    return true
  }

  function trypaste(event: KeyboardEvent) {
    if (!ispasteshortcut(event)) {
      return false
    }
    event.preventDefault()
    const clipboard = withclipboard()
    if (ispresent(clipboard)) {
      void clipboard
        .readText()
        .then(pastetext)
        .catch((err) => console.error(err))
    }
    return true
  }

  function tryshiftselection(event: KeyboardEvent, key: string) {
    if (!event.shiftKey || !SELECTION_ARROW_KEYS.has(key)) {
      return false
    }
    event.preventDefault()
    const cursor = readwanixtermguestcursor(frame!)
    if (selanchor == null) {
      setselanchor(cursor)
      setselactive(movewanixtermselection(cursor, key, frame!))
    } else {
      const next = movewanixtermselection(selactive ?? cursor, key, frame!)
      setselactive(next)
    }
    return true
  }

  function handleliveinput(event: KeyboardEvent, key: string) {
    if (key === 'escape') {
      if (hasselection) {
        event.preventDefault()
        clearsel()
        return
      }
    }
    if (tryshiftselection(event, key)) {
      return
    }
    if (trycopy(event)) {
      return
    }
    if (trypaste(event)) {
      return
    }
    if (hasselection) {
      clearsel()
    }
    const payload = encodekeyboard(event)
    const targetkey = sessionkey ?? readattachedsession()
    if (payload != null && targetkey) {
      event.preventDefault()
      wanixservertermwrite(SOFTWARE, registerreadplayer(), payload, targetkey)
    }
  }

  function handlescrolledinput(event: KeyboardEvent, key: string) {
    if (key === 'home') {
      event.preventDefault()
      scrollto('top')
      return
    }
    if (key === 'end' || (key === 'g' && event.ctrlKey)) {
      event.preventDefault()
      scrollto('live')
      return
    }
    if (key === 'pageup') {
      event.preventDefault()
      scrollby(event.shiftKey ? 10 : 1)
      return
    }
    if (key === 'pagedown') {
      event.preventDefault()
      scrollby(event.shiftKey ? -10 : -1)
      return
    }
    if (key === 'escape') {
      if (hasselection) {
        event.preventDefault()
        clearsel()
        return
      }
    }
    if (tryshiftselection(event, key)) {
      return
    }
    if (trycopy(event)) {
      return
    }
  }

  return (
    <>
      {hintline !== '' && (
        <ScrollMarquee
          margin={0}
          color={HINT_COLOR}
          y={edge.top + edge.height - 1}
          leftedge={edge.left}
          rightedge={edge.left + edge.width}
          line={`$ondkpurple${hintline}`}
        />
      )}
      <Scrollable
        blocking
        x={edge.left}
        y={edge.top}
        width={edge.width}
        height={Math.max(0, edge.height - 1)}
        onScroll={(deltay) => {
          scrollby(-deltay)
        }}
      />
      <UserInput
        keydown={(event) => {
          const key = NAME(event.key)

          if (isctrlescape(event)) {
            event.preventDefault()
            setprefixarmed(false)
            closeattachedtape()
            return
          }

          if (prefixarmed) {
            event.preventDefault()
            setprefixarmed(false)
            if (key === 'p' || key === 'arrowleft') {
              cyclewanixattachedsession(readwanixtermbufferkeys(), -1)
              return
            }
            if (key === 'n' || key === 'arrowright') {
              cyclewanixattachedsession(readwanixtermbufferkeys(), 1)
              return
            }
            if (key === 'd' || isctrlbackslash(event)) {
              detachwanixterm()
              return
            }
            if (key === 'escape') {
              return
            }
            if (!atliveline) {
              return
            }
            handleliveinput(event, key)
            return
          }

          if (isctrlbackslash(event)) {
            event.preventDefault()
            setprefixarmed(true)
            return
          }

          if (!atliveline) {
            handlescrolledinput(event, key)
            return
          }

          if (key === 'pageup') {
            event.preventDefault()
            scrollby(event.shiftKey ? 10 : 1)
            return
          }
          if (key === 'pagedown') {
            event.preventDefault()
            scrollby(event.shiftKey ? -10 : -1)
            return
          }
          if (key === 'home') {
            event.preventDefault()
            scrollto('top')
            return
          }
          if (key === 'end' || (key === 'g' && event.ctrlKey)) {
            event.preventDefault()
            scrollto('live')
            return
          }
          handleliveinput(event, key)
        }}
      />
    </>
  )
}
