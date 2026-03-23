## element - movement and state

#go <dir>  
$whitemove element one step  
#walk <dir>  
$whiteset step for continuous movement  
#idle  
$whitepause until next tick  
#set <name> <value>  
$whiteset stat or variable  
#clear <stat>  
$whiteset stats to 0  
#cycle <1-255>  
$whiteset element cycle speed

## element - transformation

#become <kind>  
$whitetransform into kind  
#char [dir] <value>  
$whiteset char at dir or self  
#color [dir] <color>  
$whiteset color at dir or self  
#bind <name>  
$whiteset copy code from named element

## element - lifecycle

#end [result]  
$whiteend program, optional arg  
#die  
$whitedelete element  
#lock / #unlock  
$whitelock or unlock chip  
#restore <id>  
$whiterestore labels  
#zap <id>  
$whitedeactivate label

## element - execution

#run <func>  
$whiterun codepage by name  
#runwith <arg> <func>  
$whiterun with argument  
#load <dir> [action]  
$whiteload code from object  
#read <from> <prop> <name>  
$whiteread property into stat  
#array <name> val  
$whiteset stat to array

## element - ui

#toast text  
$whiteshow toast notification  
#ticker text  
$whiteset ticker text

## board - navigation

#build <stat> [source]  
$whitecreate board, write id to stat  
#goto <stat> [x y]  
$whiteteleport player to board  
#transport <target>  
$whitemove object along transporter

## board - placement

#put <dir> <kind>  
$whiteplace element at direction  
#putwith <arg> <dir> <kind>  
$whiteplace with arg  
#oneof <mark> <dir> <kind>  
$whiteplace only if none with mark  
#oneofwith <arg> <mark> <dir> <kind>  
$whiteoneof with arg  
#write <dir> <color> text  
$whitewrite colored text

## board - projectiles

#shoot <dir> [kind]  
$whiteshoot bullet  
#shootwith <arg> <dir> [kind]  
$whiteshoot with arg  
#throwstar <dir>  
$whiteshoot star  
#throwstarwith <arg> <dir>  
$whitestar with arg

## board - manipulation

#duplicate / #dupe <dir> <dupedir>  
$whiteduplicate element  
#duplicatewith / #dupewith <arg> <dir> <dupedir>  
$whitedupe with arg  
#shove <dir> <movedir>  
$whitemove object  
#push <dir> <movedir>  
$whiteshove if pushable only  
#change <target> <into>  
$whitechange elements to kind

## transforms

#snapshot  
$whitesave board state  
#revert  
$whiterestore snapshot  
#copy <stat> [filter]  
$whitecopy region from board  
#remix <stat> <size> <mirror> [filter]  
$whiteremix with pattern  
#weave <dir> [filter]  
$whiteshift/wrap board  
#pivot <degrees> [filter]  
$whiterotate by degrees

## loader - file read

#readline <kind> [args]  
$whiteread text line or regex  
#readjson <jmespath> <name>  
$whitequery json into stat  
#readbin <kind> [args]  
$whiteread binary (uint8, int16, etc)

## loader - context

#withboard <stat>  
$whiteset board context  
#withobject <id>  
$whiteset element context  
#userinput <action>  
$whitesimulate input (up, down, ok, etc)

## network

#fetch <label> <url> [method] [args]  
$whitehttp request, callback at label  
#fetchwith <arg> <label> <url> [method] [args]  
$whitefetch with arg

## audio - playback

#play [buffer]  
$whiteplay music  
#bgplay [buffer]  
$whitebackground play  
#bgplayon64n $26 #bgplayon1n  
$whitequantized bg play  
#vol / #bgvol <volume>  
$whiteset volume

## audio - synthesis

#synth [config]  
$whiteconfigure play voices  
#synth1  #synth5  
$whiteper-voice config  
#synthrecord [filename]  
$whiterecord output  
#synthflush  
$whiteclear synth buffer

## audio - tts

#ttsengine <engine> [config]  
$whiteset tts engine  
#tts [voice] [phrase]  
$whitespeak or clear queue  
#ttsqueue <voice> <phrase>  
$whitequeue phrase  
#ttsvol <volume>  
$whiteset tts volume

## audio - effects

#echo / #fcrush / #autofilter  
$whitevoices 0 $26 1  
#reverb / #distort / #vibrato / #autowah  
$whitevoices 0 $26 1  
#echo1-3, #reverb1-3, etc  
$whiteper-voice

## runtime

#send <spec>  
$whitedispatch to elements  
#shortsend <spec>  
$whiteshort send  
#text text  
$whiteset gadget text  
#hyperlink <label> words  
$whitecreate hyperlink  
#help  
$whiteopen reference scroll  
#endgame  
$whiteset health to 0  
