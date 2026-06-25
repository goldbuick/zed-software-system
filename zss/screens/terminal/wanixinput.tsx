import { useCallback, useRef, useState } from 'react'
import { apierror, vmcli, wanixdetach, wanixtermwrite } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { sendwanixterminput } from 'zss/feature/wanix/wanixhost'
import {
  iswanixtermraw,
  readwanixattachedkind,
} from 'zss/feature/wanix/wanixsession'
import {
  iswanixcliescape,
  iswanixpasteevent,
  keyboardeventtoxtermdata,
  pastetexttolinebuffer,
  pastetexttovmserial,
} from 'zss/feature/wanix/wanixtermkeys'
import {
  wanixtermscreenechochar,
  wanixtermscreenecholine,
  wanixtermscreenshowclihint,
  wanixtermscreenwritepong,
} from 'zss/feature/wanix/wanixtermscreen'
import { useTape } from 'zss/gadget/data/zustandstores'
import { UserInput } from 'zss/gadget/userinput.bridge'

export function WanixTermInput() {
  const player = registerreadplayer()
  const attached = useTape((state) => state.terminalmode === 'attached')
  const [climode, setclimode] = useState(false)
  const linebuffer = useRef('')

  const sendline = useCallback(
    (line: string) => {
      if (line.startsWith('#')) {
        vmcli(SOFTWARE, player, line)
        return
      }
      wanixtermwrite(SOFTWARE, player, line)
      if (!attached && line.trim() === 'ping') {
        wanixtermscreenwritepong()
      }
    },
    [attached, player],
  )

  const reportinputerror = useCallback(
    (err: unknown) => {
      apierror(
        SOFTWARE,
        player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      )
    },
    [player],
  )

  const appendpasteintobuffer = useCallback(
    (text: string, echo: boolean) => {
      const chunk = pastetexttolinebuffer(text)
      if (!chunk.length) {
        return
      }
      linebuffer.current += chunk
      if (echo) {
        for (let i = 0; i < chunk.length; i++) {
          wanixtermscreenechochar(chunk[i])
        }
      }
    },
    [],
  )

  const handlepaste = useCallback(
    (event: KeyboardEvent) => {
      if (!iswanixpasteevent(event)) {
        return false
      }
      event.preventDefault()
      const clip = withclipboard()
      if (!clip) {
        return true
      }
      const raw = iswanixtermraw()
      void clip
        .readText()
        .then((text) => {
          if (!text.length) {
            return
          }
          if (raw) {
            void sendwanixterminput(pastetexttovmserial(text)).catch(
              reportinputerror,
            )
            return
          }
          if (climode) {
            appendpasteintobuffer(text, !attached)
            return
          }
          if (attached) {
            appendpasteintobuffer(text, false)
            return
          }
          appendpasteintobuffer(text, true)
        })
        .catch(reportinputerror)
      return true
    },
    [appendpasteintobuffer, attached, climode, reportinputerror],
  )

  const handlekeydown = useCallback(
    (event: KeyboardEvent) => {
      const vmattached = attached && readwanixattachedkind() === 'vm'
      const raw = iswanixtermraw()
      if (iswanixcliescape(event)) {
        event.preventDefault()
        linebuffer.current = ''
        if (vmattached) {
          wanixdetach(SOFTWARE, player)
          return
        }
        setclimode(true)
        if (!attached) {
          wanixtermscreenshowclihint()
        }
        return
      }

      if (handlepaste(event)) {
        return
      }

      if (climode) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setclimode(false)
          linebuffer.current = ''
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const line = linebuffer.current
          linebuffer.current = ''
          setclimode(false)
          if (line.length) {
            vmcli(SOFTWARE, player, line)
          }
          return
        }
        if (attached) {
          return
        }
        if (event.key === 'Backspace') {
          event.preventDefault()
          if (linebuffer.current.length > 0) {
            linebuffer.current = linebuffer.current.slice(0, -1)
            wanixtermscreenechochar('\b')
          }
          return
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          linebuffer.current += event.key
          wanixtermscreenechochar(event.key)
        }
        return
      }

      if (raw) {
        if (event.repeat) {
          return
        }
        const text = keyboardeventtoxtermdata(event)
        if (!text) {
          return
        }
        event.preventDefault()
        void sendwanixterminput(text).catch(reportinputerror)
        return
      }

      if (attached) {
        if (event.key === 'Enter') {
          event.preventDefault()
          const line = linebuffer.current
          linebuffer.current = ''
          sendline(line)
        } else if (event.key === 'Backspace') {
          event.preventDefault()
          if (linebuffer.current.length > 0) {
            linebuffer.current = linebuffer.current.slice(0, -1)
          }
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          linebuffer.current += event.key
        }
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const line = linebuffer.current
        linebuffer.current = ''
        wanixtermscreenecholine(line)
        sendline(line)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        if (linebuffer.current.length > 0) {
          linebuffer.current = linebuffer.current.slice(0, -1)
          wanixtermscreenechochar('\b')
        }
        return
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        linebuffer.current += event.key
        wanixtermscreenechochar(event.key)
      }
    },
    [attached, climode, handlepaste, player, reportinputerror, sendline],
  )

  return <UserInput keydown={handlekeydown} />
}
