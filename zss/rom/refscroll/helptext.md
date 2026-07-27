## typography

plain text
$whiteuse $34@quoted strings for special chars$34
$$0-255 for ascii chars $159$176$240
$whiteuse color names like $RED$$red$yellow to change foreground color
$whiteuse color names like $black$ONGREEN$$ongreen$ONCLEAR$yellow to change background color
$whiteuse onclear $WHITE$$onclear$yellow to change background to transparent

## hyperlinks

- !message; Label
$whitesend the given #message when the hyperlink is pressed

- !message hotkey `<shortcut>`; Label
- !message hk `<shortcut>`; Label
$whitesend the given #message when the shortcut is pressed
$whiteis-hotkey listens for shortcut

!openit https://github.com/ianstormtaylor/is-hotkey;$whiteis-hotkey on https://github.com/

- !flagorstat range [minword] [maxword]; Label
- !flagorstat rn [minword] [maxword]; Label
$whiteuses the standard 1 to 9 values input range
$whiteminword is the label for value 1
$whitemaxword is the label for value 9
$whitewrite user range input into a flagorstat

- !flagorstat select <choices>; Label
- !flagorstat sl <choices>; Label
$whitechoices is a list of word value pairs
$whiteselect cycles through preset choices
$whitewrite user select input into a flagorstat

- !flagorstat number; Label
- !flagorstat nm; Label
$whitewrite user number input into a flagorstat

- !flagorstat text; Label
- !flagorstat tx; Label
$whitewrite user text input into a flagorstat

- !copyit content goes here; Label
$whitecopies given content into the clipboard

- !openit url; Label
- !openit zns slug; ZNS docs scroll (docs.at.zed.cafe, ROM fallback)
$whiteopens the given url in a new browser tab

- !runit content goes here; Label
$whiteopens the cli, with the input filled with the given content

!helpmenu hk b " B " next;$ltgreyBack to help
