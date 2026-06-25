import { WanixIframeChildTree } from 'cafe/wanix/wanixiframechildtree'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createwanixiframechildcontroller } from 'zss/feature/wanix/wanixiframechildcontroller'
import { iswanixtermiframemsg } from 'zss/feature/wanix/wanixtermiframeprotocol'
import { installwanixtermprobeembed } from 'zss/feature/wanix/wanixtermprobe'

export function WanixIframeHost() {
  const controller = useMemo(() => createwanixiframechildcontroller(), [])
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getstate,
    controller.getstate,
  )

  useEffect(() => {
    let cancelled = false

    void customElements.whenDefined('wanix-system').then(() => {
      if (cancelled) {
        return
      }
      installwanixtermprobeembed()
    })

    const onmessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }
      const { data } = event
      if (!iswanixtermiframemsg(data)) {
        return
      }
      if (data.type === 'zss-wanix-term-rpc') {
        void controller.handlerrpc(data, event.source)
      }
    }

    window.addEventListener('message', onmessage)
    return () => {
      cancelled = true
      window.removeEventListener('message', onmessage)
    }
  }, [controller])

  return <WanixIframeChildTree state={state} controller={controller} />
}
