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
  SHOOT_LEFT?: UserInputHandler
  SHOOT_RIGHT?: UserInputHandler
  SHOOT_UP?: UserInputHandler
  SHOOT_DOWN?: UserInputHandler
  OK_BUTTON?: UserInputHandler
  CANCEL_BUTTON?: UserInputHandler
  MENU_BUTTON?: UserInputHandler
  BUTTON_A?: UserInputHandler
  BUTTON_B?: UserInputHandler
  BUTTON_X?: UserInputHandler
  BUTTON_Y?: UserInputHandler
  BUTTON_L1?: UserInputHandler
  BUTTON_L2?: UserInputHandler
  BUTTON_R1?: UserInputHandler
  BUTTON_R2?: UserInputHandler
  keydown?: KeyboardInputHandler
}
