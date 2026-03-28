export type UserInputMods = {
  alt: boolean
  ctrl: boolean
  shift: boolean
}

export type UserInputHandler = (mods: UserInputMods) => void

export type KeyboardInputHandler = (event: KeyboardEvent) => void

export type UserInputProps = {
  MOVE_LEFT?: UserInputHandler
  MOVE_RIGHT?: UserInputHandler
  MOVE_UP?: UserInputHandler
  MOVE_DOWN?: UserInputHandler
  OK_BUTTON?: UserInputHandler
  CANCEL_BUTTON?: UserInputHandler
  MENU_BUTTON?: UserInputHandler
  keydown?: KeyboardInputHandler
}
