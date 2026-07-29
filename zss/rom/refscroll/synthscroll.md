## select voice or wave

#synth <name>
$whiteuse #synth1 - #synth5 for one play voice or bgplay

## waves

#synth sine / square / triangle / sawtooth / custom
#synth pwm / pulse
#synth amsine / amsquare / amtriangle / amsawtooth
#synth fmsine / fmsquare / fmtriangle / fmsawtooth
#synth fatsine / fatsquare / fattriangle / fatsawtooth
$whitesee O for am, fm, fat, and phase params

## noise and chips

#synth retro / buzz / clang / metallic / noise / hollow
#synth bells / doot

## algo and instruments

#synth algo0 - algo7
#synth string / pluck
#synth flute / clarinet / brass
#synth piano / violin / steel / tonewheel

## shared settings

#synth restart
$whiteclears config memory
#synth vol <db>
$whitecontrol volume
#synth port <seconds>
$whiteportamento time
#synth env <a> <d> <s> <r>
$whiteconfigs survive type switch until restart

## config-only commands

#string / #fmsquare / #piano ...
$whitedoes not select type; use #synth <name> to select
#string1 - #string5
$whitebare = play 0-3; 1-4 = one voice; 5 = bgplay

## voice specific

!oscscroll hk o " O " next;sine, am, fm, fat waves
!pwmscroll hk m " M " next;pwm
!pulsescroll hk u " U " next;pulse
!algoscroll hk a " A " next;algo0 $26 algo7
!stringscroll hk s " S " next;string, pluck
!windscroll hk w " W " next;flute, clarinet, brass
!pianoscroll hk i " I " next;piano
!bowedscroll hk v " V " next;violin
!guitarscroll hk g " G " next;steel
!organscroll hk n " N " next;tonewheel
!menu hk b " B " next;$ltgreyBack to main menu
