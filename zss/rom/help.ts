import { parsetarget } from 'zss/device'

export function helpread(address: string) {
  const { target, path } = parsetarget(address)
  switch (target) {
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
!openit https://github.com/ianstormtaylor/is-hotkey;uses is-hotkey
option;!range flag [minword] [maxword];
option;!select flag ...list of <word> <value> pairs;
option;!text flag [minvalue] [maxvalue];
      `.trim()
    default:
      return 'test'
  }
}
