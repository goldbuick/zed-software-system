import { Token, marked } from 'marked'
import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import { ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

const COLOR_EDGE = '$dkpurple'
const CHR_TM = '$196'
const CHR_BM = '$205'

function gadgettbar(player: string, width: number) {
  const CHR_TBAR = CHR_TM.repeat(width)
  gadgettext(player, `${COLOR_EDGE}${CHR_TBAR}`)
}

function gadgetbbar(player: string, width: number) {
  const CHR_BBAR = CHR_BM.repeat(width)
  gadgettext(player, `${COLOR_EDGE}${CHR_BBAR}`)
}

function gadgetheader(player: string, header: string) {
  gadgettext(player, `${COLOR_EDGE} ${' '.repeat(header.length)} `)
  gadgettbar(player, header.length + 2)
  gadgettext(player, `${COLOR_EDGE} $white${header} `)
  gadgetbbar(player, header.length + 2)
}

function createlink(player: string, link: string, label: string) {
  const parts = link.split(' ')
  const start = NAME(parts[0] ?? '')
  switch (start) {
    case 'copyit':
      gadgethyperlink(player, 'refscroll', label, [
        '',
        parts[0] ?? '',
        parts[1] ?? '',
      ])
      break
    default: {
      const second = NAME(parts[1] ?? '')
      switch (second) {
        case 'hk':
        case 'hotkey':
          gadgethyperlink(player, 'refscroll', label, [
            parts[0] ?? '',
            parts[1] ?? '',
            parts[2] ?? '',
            ` ${parts[3] ?? ''} `,
            parts[4] ?? '',
          ])
          break
        default:
          gadgethyperlink(player, 'refscroll', label, [parts[0] ?? ''])
          break
      }
      break
    }
  }
}

function parsetoken(player: string, token: Token) {
  switch (token.type) {
    default:
      console.info('unknown', token)
      break
    case 'heading':
      gadgetheader(player, token.text)
      gadgettext(player, ' ')
      break
    case 'hr':
      gadgettext(player, ' ')
      gadgettbar(player, 10)
      gadgettext(player, ' ')
      break
    case 'paragraph':
      for (let i = 0; i < (token.tokens?.length ?? 0); ++i) {
        if (ispresent(token.tokens?.[i])) {
          parsetoken(player, token.tokens[i])
        }
      }
      break
    case 'code':
      token.text
        .split('\n')
        .forEach((line: string) =>
          gadgettext(player, line.replace(/\s+/g, ' ').trim()),
        )
      break
    case 'text':
      gadgettext(player, token.text)
      break
    case 'link': {
      const [first, ...mods] = token.text
        .split('|')
        .map((item: string) => item.trim())
      const words = [...mods, token.href ?? '']
      createlink(player, words.join(' '), first)
      break
    }
    case 'image':
      createlink(
        player,
        `openit ${token.href}`,
        `show ${token.title ?? token.href}`,
      )
      break
    case 'blockquote':
      token.text.split('\n').forEach((line: string) => {
        gadgettext(player, `$dkpurple$221$white  ${line}`)
      })
      gadgettext(player, ' ')
      break
    case 'list':
      for (let i = 0; i < (token.items?.length ?? 0); ++i) {
        if (ispresent(token.items?.[i])) {
          parsetoken(player, token.items[i])
        }
      }
      gadgettext(player, ' ')
      break
    case 'list_item':
      gadgettext(player, ` $grey$7 ${token.text}`)
      break
  }
}

export function parsemarkdownforscroll(player: string, content: string) {
  marked.use({
    pedantic: false,
    gfm: true,
    breaks: false,
    renderer: {
      heading(token) {
        parsetoken(player, token)
        return ''
      },
      blockquote(token) {
        parsetoken(player, token)
        return ''
      },
      hr(token) {
        parsetoken(player, token)
        return ''
      },
      list(token) {
        parsetoken(player, token)
        return ''
      },
      listitem(token) {
        parsetoken(player, token)
        return ''
      },
      paragraph(token) {
        parsetoken(player, token)
        return ''
      },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  marked.parse(content)
}
