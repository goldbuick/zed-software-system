import { useCallback, useRef, useState } from 'react'
import { apierror, vmcli, wanixtermwrite } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { sendwanixterminput } from 'zss/feature/wanix/wanixhost'
import { iswanixtermraw } from 'zss/feature/wanix/wanixsession'
import {
  iswanixcliescape,
  keyboardeventtoxtermdata,
} from 'zss/feature/wanix/wanixtermkeys'
import { wanixtrace } from 'zss/feature/wanix/wanixtrace'
import {
  wanixtermscreenechochar,
  wanixtermscreenecholine,
  wanixtermscreenshowclihint,
  wanixtermscreenwritepong,
} from 'zss/feature/wanix/wanixtermscreen'
import { UserInput } from 'zss/gadget/userinput'

export function WanixTermInput() {
  const player = registerreadplayer()
  const raw = iswanixtermraw()
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

  const handlekeydown = useCallback(
    (event: KeyboardEvent) => {
      if (iswanixcliescape(event)) {
        event.preventDefault()
        setclimode(true)
        wanixtermscreenshowclihint()
        linebuffer.current = ''
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
        void sendwanixterminput(text).catch((err) => {
          apierror(
            SOFTWARE,
            player,
            'wanix',
            err instanceof Error ? err.message : String(err),
          )
        })
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
    [climode, player, raw, sendline],
  )

  return <UserInput keydown={handlekeydown} />
}
