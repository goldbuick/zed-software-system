import { Token, marked } from 'marked'
import { SOFTWARE } from 'zss/device/session'
import {
  write,
  writeheader,
  writehyperlink,
  writetbar,
} from 'zss/feature/writeui'
import { ispresent } from 'zss/mapping/types'

function parsetoken(player: string, token: Token) {
  switch (token.type) {
    default:
      console.info(token)
      break
    case 'heading':
      writeheader(SOFTWARE, player, token.text)
      break
    case 'hr':
      writetbar(SOFTWARE, player, 10)
      write(SOFTWARE, player, ' ')
      break
    case 'paragraph':
      for (let i = 0; i < (token.tokens?.length ?? 0); ++i) {
        if (ispresent(token.tokens?.[i])) {
          parsetoken(player, token.tokens[i])
        }
      }
      write(SOFTWARE, player, ' ')
      break
    case 'text':
      write(SOFTWARE, player, token.text)
      break
    case 'link': {
      const [first, ...mods] = token.text
        .split('|')
        .map((item: string) => item.trim())
      const words = [...mods, token.href ?? '']
      writehyperlink(SOFTWARE, player, words.join(' '), first)
      break
    }
    case 'image':
      writehyperlink(
        SOFTWARE,
        player,
        `openit ${token.href}`,
        `show ${token.title ?? token.href}`,
      )
      break
    case 'blockquote':
      token.text.split('\n').forEach((line: string) => {
        write(SOFTWARE, player, `$dkpurple$221$white  ${line}`)
      })
      write(SOFTWARE, player, ' ')
      break
    case 'list':
      for (let i = 0; i < (token.items?.length ?? 0); ++i) {
        if (ispresent(token.items?.[i])) {
          parsetoken(player, token.items[i])
        }
      }
      write(SOFTWARE, player, ' ')
      break
    case 'list_item':
      write(SOFTWARE, player, ` $grey$7 ${token.text}`)
      break
  }
}

export function parsemarkdownforwriteui(player: string, content: string) {
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
