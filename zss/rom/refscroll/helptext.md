## typography

plain text  
use $34@quoted strings for special chars$34  
$$0-255 for ascii chars $159$176$240  
use color names like $RED$$red$yellow to change  
 foreground color  
use color names like $black$ONGREEN$$ongreen$ONCLEAR$yellow to change  
 background color  
use onclear $WHITE$$onclear$yellow to change  
 background to transparent

## hyperlinks

- !message; Label

send the given #message when the  
<hyperlink> is pressed

- !message hotkey <shortcut>; Label

- !message hk <shortcut>; Label

send the given #message when the <shortcut>  
is pressed. is-hotkey listens for <shortcut>

!openit https://github.com/ianstormtaylor/is-hotkey;$whiteis-hotkey on https://github.com/

- !flagorstat range [minword] [maxword]; Label

- !flagorstat rn [minword] [maxword]; Label

uses the standard 1 to 9 values input range  
[minword] is the label for value 1  
[maxword] is the label for value 9  
write user range input into a flagorstat

- !flagorstat select <choices>; Label

- !flagorstat sl <choices>; Label

<choices> is a list of <word> <value> pairs  
select gives a user a way to cycle through  
preset choices  
write user select input into a flagorstat

- !flagorstat number; Label

- !flagorstat nm; Label

write user number input into a flagorstat

- !flagorstat text; Label

- !flagorstat tx; Label

write user text input into a flagorstat

- !copyit content goes here; Label

copies given content into the clipboard

- !openit url; Label

opens the given url in a new browser tab

- !runit content goes here; Label

opens the cli, with the input filled out with   
the given content