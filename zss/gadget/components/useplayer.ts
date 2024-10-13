import { createContext, useContext } from 'react'

export const PlayerContext = createContext('')

export function usePlayer() {
  return useContext(PlayerContext)
}
