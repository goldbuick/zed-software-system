import { compileAST } from './ast'

export function langTest() {
  const result = compileAST(`@main

#gadget clear
' we have different regions top right bottom left scroll and main
' with each of these commands you "slice" a section of the screen

#gadget right
"Dooot and hello
!all:doot;Doot

#gadget scroll
"Your name:
#input player:name
!player:begin;Begin

#gadget main
' does this make sense ?
' nothing here for now ...
  `)

  console.info('###', result)
}
