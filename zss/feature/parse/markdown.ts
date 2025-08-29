import { Link, RootContent } from 'mdast'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import { SOFTWARE } from 'zss/device/session'
import {
  write,
  writeheader,
  writehyperlink,
  writetbar,
} from 'zss/feature/writeui'
import { randominteger } from 'zss/mapping/number'
import { MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

let textmode = 'text'
let activelink: MAYBE<Link>
function parserootcontent(player: string, node: RootContent) {
  switch (node.type) {
    default:
      // console.info('mrk', node)
      break
    case 'heading':
      textmode = 'heading'
      for (let i = 0; i < node.children.length; ++i) {
        parserootcontent(player, node.children[i])
      }
      textmode = 'text'
      break
    case 'blockquote':
      textmode = 'blockquote'
      for (let i = 0; i < node.children.length; ++i) {
        parserootcontent(player, node.children[i])
      }
      textmode = 'text'
      break
    case 'list':
      for (let i = 0; i < node.children.length; ++i) {
        parserootcontent(player, node.children[i])
      }
      break
    case 'listItem':
      textmode = 'listitem'
      for (let i = 0; i < node.children.length; ++i) {
        parserootcontent(player, node.children[i])
      }
      textmode = 'text'
      break
    case 'paragraph':
      for (let i = 0; i < node.children.length; ++i) {
        parserootcontent(player, node.children[i])
      }
      write(SOFTWARE, player, ' ')
      break
    case 'link':
      textmode = 'link'
      activelink = node
      for (let i = 0; i < node.children.length; ++i) {
        parserootcontent(player, node.children[i])
      }
      textmode = 'text'
      activelink = undefined
      break
    case 'thematicBreak':
      write(SOFTWARE, player, ' ')
      writetbar(SOFTWARE, player, 10)
      write(SOFTWARE, player, ' ')
      break
    case 'image':
      writehyperlink(
        SOFTWARE,
        player,
        `openit ${node.url}`,
        `show ${node.alt ?? node.url}`,
      )
      break
    case 'text':
      switch (textmode) {
        case 'heading':
          writeheader(SOFTWARE, player, node.value)
          break
        case 'blockquote':
          write(SOFTWARE, player, `$dkpurple$221$white  ${node.value}`)
          break
        case 'listitem':
          write(SOFTWARE, player, ` $grey$7 ${node.value}`)
          break
        case 'text':
          write(SOFTWARE, player, node.value)
          break
        case 'link': {
          const [first, ...mods] = node.value
            .split('|')
            .map((item) => item.trim())
          const words = [...mods, activelink?.url ?? '']
          writehyperlink(SOFTWARE, player, words.join(' '), first)
          break
        }
      }
      break
  }
}

export function parsemarkdown(player: string, content: string) {
  const root = remark().use(remarkGfm).parse(content)
  for (let i = 0; i < root.children.length; ++i) {
    parserootcontent(player, root.children[i])
  }
}

export async function fetchwiki(pagepath: string) {
  const nocache = randominteger(1111111, 9999999)
  const wikiname = NAME(pagepath.replace(/[^a-zA-Z/]/g, ''))
  const result = await fetch(
    `https://raw.githubusercontent.com/wiki/goldbuick/zed-software-system/${wikiname}.md?q=${nocache}`,
  )
  return await result.text()
}
