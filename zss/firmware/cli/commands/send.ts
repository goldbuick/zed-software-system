import { apilog, vmloader, vmmakeitscroll } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { maptostring } from 'zss/mapping/value'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memoryreadflags } from 'zss/memory/flags'
import { memorysendtoelements, memorysendtolog } from 'zss/memory/gamesend'
import { READ_CONTEXT } from 'zss/words/reader'
import { parsesend } from 'zss/words/send'
import { COLOR } from 'zss/words/types'

export function registerSendCommands(fw: FIRMWARE): FIRMWARE {
  return fw
    .command(
      'shortsend',
      ['message (short form, no target keyword needed)'],
      (chip, words) => {
        const send = parsesend(words)
        if (send.targetname === 'self') {
          vmloader(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            undefined,
            'text',
            `cli:${send.label}`,
            send.args.join(' '),
          )
        } else {
          memorysendtoelements(chip, READ_CONTEXT.element, send)
        }
        return 0
      },
    )
    .command('send', ['message to target elements'], (chip, words) => {
      const send = parsesend(words, true)
      memorysendtoelements(chip, READ_CONTEXT.element, send)
      return 0
    })
    .command('stat', ['text in a scroll window'], (_, words) => {
      vmmakeitscroll(
        SOFTWARE,
        READ_CONTEXT.elementfocus,
        words.map(maptostring).join(' '),
      )
      return 0
    })
    .command('text', ['text on element or in sidebar'], (_, words) => {
      const ticker = words.map(maptostring).join(' ')
      if (ispresent(READ_CONTEXT.element) && READ_CONTEXT.elementisplayer) {
        READ_CONTEXT.element.tickertext = ticker
        READ_CONTEXT.element.tickertime = READ_CONTEXT.timestamp
        memorysendtolog('', READ_CONTEXT.element, ticker)
        const { user } = memoryreadflags(READ_CONTEXT.elementid)
        const withuser = isstring(user) ? user : 'player'
        vmloader(
          SOFTWARE,
          READ_CONTEXT.elementid,
          undefined,
          'text',
          `chat:message:${READ_CONTEXT.board?.id ?? ''}`,
          `${withuser}:${ticker}`,
        )
      }
      return 0
    })
    .command('hyperlink', ['clickable link in scroll or log'], (chip, args) => {
      const [label, ...words] = args
      const { user } = memoryreadflags(READ_CONTEXT.elementid)
      const withuser = isstring(user) ? user : 'player'
      const icon = memoryreadelementdisplay(READ_CONTEXT.element)
      const player = `$${COLOR[icon.color]}$ON${COLOR[icon.bg]}$${icon.char}$ONCLEAR $WHITE${withuser}$BLUE `
      const labelstr = chip.template(maptostring(label).split(' '))
      apilog(
        SOFTWARE,
        READ_CONTEXT.elementid,
        `!${chip.template(words)};${player}${labelstr}`,
      )
      return 0
    })
}
