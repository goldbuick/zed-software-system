import mitt from 'mitt'
import { createContext } from 'react'

export const user = {
  root: mitt(),
  ignorehotkeys: false,
}

export const UserInputContext = createContext(user.root)
