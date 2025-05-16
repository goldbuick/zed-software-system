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
option;!hotkey;label
option;!range statorflag [label min] [label max];input label
option;!select statorflag ...list of <label> <value> pairs;input label
      `.trim()
    default:
      return 'test'
  }
}

// writetext(
//   SOFTWARE,
//   `${fg('white', '"!hotkey"')} message shortcut;${fg('gray', 'Label')}`,
// )
// writetext(
//   SOFTWARE,
//   `${fg('white', '"!range"')} flag [labelmin] [labelmax];${fg('gray', 'Input Label')}`,
// )
// writetext(
//   SOFTWARE,
//   `${fg('white', '"!select"')} flag ...list of values;${fg('gray', 'Input Label')}`,
// )
// writetext(
//   SOFTWARE,
//   `${fg('white', '"!number"')} flag [minvalue] [maxvalue];${fg('gray', 'Input Label')}`,
// )
// writetext(
//   SOFTWARE,
//   READ_CONTEXT.elementfocus,
//   `${fg('white', '"!text"')} flag;${fg('gray', 'Input Label')}`,
// )
// writetext(
//   SOFTWARE,
//   READ_CONTEXT.elementfocus,
//   `${fg('white', '"!copyit"')} flag;${fg('gray', 'Input Label')}`,
// )
// writetext(
//   SOFTWARE,
//   READ_CONTEXT.elementfocus,
//   `${fg('white', '"!openit"')} flag;${fg('gray', 'Input Label')}`,
// )
