import { PACKAGE, TYPE } from '../format'

const content: PACKAGE = {
  name: 'zed-cafe',
  version: 0,
  author: 'goldbuick',
  description: 'default software for zed-cafe',
  codepages: [
    {
      type: TYPE.ZSS,
      zss: `@main

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

`,
    },
  ],
  uses: {},
}

export default content

/*

  DONT FORGET GADGET NEEDS A CLIENT / SERVER setup

  // labels
  LABEL,
  // interactables
  BUTTON,
  // content
  TEXT_EDIT,
*/
