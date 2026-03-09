import { createContext, useContext } from 'react'
import { createwritetextcontext } from 'zss/words/textformat'

export const WriteTextContext = createContext(
  createwritetextcontext(1, 1, 15, 1),
)

export function useWriteText() {
  return useContext(WriteTextContext)
}
