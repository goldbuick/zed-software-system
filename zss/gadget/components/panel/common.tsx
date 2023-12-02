import { createContext } from 'react'

type ScrollContextState = {
  sendmessage: (target: string) => void
  sendclose: () => void
  didclose: () => void
}

export const ScrollContext = createContext<ScrollContextState>({
  sendmessage() {},
  sendclose() {},
  didclose() {},
})

export const PlayerContext = createContext('')
