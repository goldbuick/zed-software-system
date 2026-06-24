import { useCallback, useRef, useState } from 'react'
import { apierror, vmcli, wanixdetach, wanixtermwrite } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import {
  sendwanixterminput,
  sendwanixvmline,
} from 'zss/feature/wanix/wanixhost'
import {
  iswanixtermraw,
  readwanixattachedkind,
} from 'zss/feature/wanix/wanixsession'
import {
  iswanixcliescape,
  keyboardeventtoxtermdata,
} from 'zss/feature/wanix/wanixtermkeys'
import {
  wanixtermscreenechochar,
  wanixtermscreenecholine,
  wanixtermscreenshowclihint,
  wanixtermscreenwrite,
  wanixtermscreenwritepong,
} from 'zss/feature/wanix/wanixtermscreen'
import { wanixtrace } from 'zss/feature/wanix/wanixtrace'
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
      if (line.trim() === 'ping') {
        wanixtermscreenwritepong()
      }
    },
    [player],
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

  const handlekeydown = useCallback(
    (event: KeyboardEvent) => {
      const vmattached = attached && readwanixattachedkind() === 'vm'
      const raw = iswanixtermraw() && !vmattached
      if (iswanixcliescape(event)) {
        event.preventDefault()
        linebuffer.current = ''
        if (vmattached) {
          wanixdetach(SOFTWARE, player)
          return
        }
        setclimode(true)
        wanixtermscreenshowclihint()
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
          return
        }
        return
      }

      // VM serial: line-buffered with local tile echo; serial echo of submitted line is stripped in wanixhost.
      if (vmattached) {
        if (event.repeat) {
          return
        }
        if (event.ctrlKey || event.metaKey) {
          if (event.key === 'c' || event.key === 'C') {
            event.preventDefault()
            linebuffer.current = ''
            void sendwanixterminput('\x03').catch(reportinputerror)
          }
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const line = linebuffer.current
          linebuffer.current = ''
          wanixtermscreenwrite('\r\n')
          wanixtrace('term-input:line', { len: line.length })
          void sendwanixvmline(line).catch(reportinputerror)
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
        if (event.key.length === 1) {
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
        wanixtrace('term-input', { len: text.length })
        void sendwanixterminput(text).catch(reportinputerror)
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
    [attached, climode, player, reportinputerror, sendline],
  )

  return <UserInput keydown={handlekeydown} />
}
