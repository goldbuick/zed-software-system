import { compileAST } from './ast'
import transformAst from './transformer'

/*
@main @terrain
@wavy 3 24
@target link

/n/n/n/n/n/i

' zzt branching
#if banana1 all:doot1
#try n endgame
#take health 10 all:butts

*/

export function langTest() {
  const astResult = compileAST(`

#while a < (23 * 1000) % bart
  #char 67

' zzt nested branching / movement
#if grapes if apples /w/w/w/w/w try n all:doot

' compact branching
#if frogs eq 32 all:shit
#else if apples all:doot
#else other:awesome

' block branching
#if frogs
  #char 2
  #all:shit
#else if apples
  #char 24
  #all:doot
#else
  #char 32
  #other:awesome

' mixed branching
#if frogs all:shit
#else if apples
  #char 24
  #all:doot
#else
  #char 32
  #other:awesome
 
#if frogs
  #char 2
  #all:shit
#else if apples all:doot
#else
  #char 32
  #other:awesome

#if frogs
  #char 2
  #all:shit
#else if apples
  #char 24
  #all:doot
#else other:awesome

' alt branching
#take health 5 + 23 ohno
#else take group 5
#else endgame

  `)

  if (astResult.errors) {
    console.info(astResult.tokens)
    console.info(astResult.errors[0])
    return
  }

  const jsCode = transformAst(astResult.ast)
  console.info(jsCode.code)
  console.info(jsCode.labels)
}

/*



stats @
flags (ie: stats on the currently focused player)

all stat/flag identifiers are player by default, 
have to declare a local @stat 

#cycle 32
#if any red fish repeat all:flash

@main @terrain
@wavy 3 24
@target link

#if frogs
  "Let's razzle dazzle !
#elif grapes banana
#else all:doot

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


    // have to find a smooth way to define an external set of command keywords
    // the idea that nested commands do not need # before
    // and how do we determine if its a message ?
    // we can nest #if commands, #break, and #continue ..

    so we have a linear chaining 

    any OG command that does  #a eval execute 

    I think we only care about nesting when it comes to control flow commands
    ie: try, take, give, if, for, while, repeat, break, continue
    I think everything else can be handled internally with the __command(...) invoke

    ' valid
    #if any red fish break
    #else all:gogogo

    ' valid
    #if any red fish #break
    #else #all:gogogo

    ' valid
    #if any red fish if any blue fish break
    #else #all:gogogo

    ' valid
    #if any red fish if any blue fish #break
    #else #all:gogogo


*/
