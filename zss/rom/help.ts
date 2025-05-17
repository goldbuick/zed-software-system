import { parsetarget } from 'zss/device'
import { metakey } from 'zss/words/system'

export function helpread(address: string) {
  const { target } = parsetarget(address)
  switch (target) {
    case 'menu':
      return `
header;H E L P
keyboard input
option;? or /;open terminal
option;esc;close terminal, scroll, or editor
option;tab;change layout
option;up or down arrow keys;navigate terminal items
option;left or right arrow keys;change terminal items
option;enter;activate terminal items
option;alt + arrow keys;skip words and terminal lines
option;${metakey} + up / down arrow keys;input history
$32
option;controls;zss controls and inputs
!helpcontrols;read help controls
$32
option;text;zss text and inputs
!helptext;read help text
$32
option;developer;developer commands
!helpdeveloper;read help developer
$32
option;player;player settings & hotkeys
!helpplayer;read help player
      `.trim()
    case 'controls':
      return `
header;zss controls and inputs
section;keyboard input
option;arrow keys;move
option;shift + arrow keys;shoot
option;enter;ok / accept
option;escape;cancel / close
option;tab;menu / action
section;controller input
option;left stick;move
option;right stick;aim
option;a;ok / accept
option;b;cancel / close
option;y;menu / action
option;x;shoot
option;triggers;shoot
        `.trim()
    case 'text':
      return `
header;text formatting
section;typography
plain text
use"@quoted strings for special chars"
$$0-255 for ascii chars $159$176$240
use color names like $RED$$red$BLUE to change foreground color
use color names like $ONGREEN$$ongreen$ONCLEAR to change background color
use onclear $WHITE$$onclear$BLUE to change background to transparent
section;hyperlinks
option;!hotkey label <shortcut> [shortcutword];
send the given #label when the <shortcut> is pressed
!openit https://github.com/ianstormtaylor/is-hotkey;$BLUEuses is-hotkey
option;!range flag [minword] [maxword];
uses the standard 1 to 9 values input range
option;!select flag ...list of <word> <value> pairs;
gives a user a way to cycle through preset values
option;!text flag;
write user text input into a flag
      `.trim()
    case 'developer':
      return `
header;developer commands
option;#books;list books in memory
option;#pages;list pages in opened book
option;@[pagetype:]page name;create & edit a new codepage in the currently opened book
option;#trash;list books and pages from open book you can delete
option;#save;flush state to register
option;#share;creates a click to copy share url and QR code
`.trim()
    case 'player':
      return `
header;player settings
todo - lol :3
  `.trim()
    default:
      return undefined
  }
}
