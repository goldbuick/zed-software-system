import { compileAST } from './ast'
import transformAst from './transformer'

export function langTest() {
  const astResult = compileAST(`@main @terrain
@wavy 3 24
@target link
/w/w/w/w/down
#gadget clear
' we have different regions top right bottom left scroll and main
' with each of these commands you "slice" a section of the screen

#gadget right 20
"Dooot and hello
$Freeeeeet's
!all:doot;Doot

#gadget scroll
"Your name:
#input player:name
!player:begin;Begin

#gadget main
' does this make sense ?
' nothing here for now ...

#all:banana
  `)

  if (astResult.errors) {
    return { errors: astResult.errors }
  }

  const jsCode = transformAst(astResult.ast)

  console.info('jsCode', jsCode)
  console.info(jsCode.code)
}
