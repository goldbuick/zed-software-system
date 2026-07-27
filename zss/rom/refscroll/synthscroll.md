switching voices  
#synth <sine, square, triangle, sawtooth, custom>  
#synth <pwm, pulse>  
#synth <amsine, amsquare, amtriangle, amsawtooth>  
#synth <fmsine, fmsquare, fmtriangle, fmsawtooth>  
#synth <fatsine, fatsquare, fattriangle, fatsawtooth>  
#synth <retro, buzz, clang, metallic, noise, hollow>  
#synth <bells, doot>  
#synth <algo0, algo1, ... , algo7>  
#synth <string, pluck>  
#synth <flute, clarinet, brass>  
#synth <piano, violin, steel, tonewheel>  
#synth1 $26 #synth5  
$whiteper-voice / bgplay select  

voice settings  
#synth restart - clears config memory  
#synth vol <db> - control volume  
#synth port <seconds>  
#synth env <attack> <decay> <sustain> <release>  
$whiteconfigs survive type switch until restart  

config-only (does not select type)  
#string / #fmsquare / #piano ...  
#string1 $26 #string4 / #string5  
$whitebare = play 0-3; 1-4 = one voice; 5 = bgplay  

voice specific  
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
