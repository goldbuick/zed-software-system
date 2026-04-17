import { useMemo, useState } from 'react'
import { boardrunnergadgetclearscroll } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { ScrollContext } from 'zss/screens/panel/common'

import { ScreenUILayoutContext, useScreenChromeLayout } from './layoutstate'

type ScreenUIScrollProviderProps = {
  children: React.ReactNode
}

export function ScreenUIScrollProvider({
  children,
}: ScreenUIScrollProviderProps) {
  const [hasscroll, sethasscroll] = useState(false)
  const player = registerreadplayer()
  const layout = useScreenChromeLayout(hasscroll, sethasscroll)

  const scrollcontextvalue = useMemo(
    () => ({
      sendmessage(target: string, data: any[]) {
        SOFTWARE.emit(player, target, data)
      },
      sendclose() {
        boardrunnergadgetclearscroll(SOFTWARE, player)
      },
      didclose() {
        sethasscroll(false)
      },
    }),
    [player],
  )

  return (
    <ScrollContext.Provider value={scrollcontextvalue}>
      <ScreenUILayoutContext.Provider value={layout}>
        {children}
      </ScreenUILayoutContext.Provider>
    </ScrollContext.Provider>
  )
}
