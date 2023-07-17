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
#gadget start
#gadget right 100
"<-= HELLO =->" !all:start;Press me
"<-= WORLD =->" !player:name;text;Player Name
"<-= WOOOT =->" !player:collision;walk,swim,fly;Collision
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
