import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { bookwritecodepage } from 'zss/memory/book'
import {
  codepagereadname,
  codepagereadtypetostring,
  createcodepage,
} from 'zss/memory/codepage'
import { NAME } from 'zss/words/types'

import { write, writecopyit } from '../writeui'

type ZZM_SONG = {
  order: number
  title: string
  lines: string[]
}

type ZZM_SET = {
  title: string
  gendate: string
  gentime: string
  songs: ZZM_SONG[]
}

const META_CHECK = /; \$(\w+) ?(.*)/
const TITLE_CHECK = /title (.+?) (.*)/i

function escapestring(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function parsezzm(player: string, content: string) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    return
  }

  const lines = content.split(/\r?\n/)
  const album: ZZM_SET = {
    title: '',
    gendate: '',
    gentime: '',
    songs: [],
  }

  function findwithorder(order: number): MAYBE<ZZM_SONG> {
    return album.songs.find((el) => el.order === order)
  }
  function createsong(order: number, title: string): ZZM_SONG {
    return {
      order,
      title,
      lines: [],
    }
  }

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i]
    const check = META_CHECK.exec(line)
    if (ispresent(check)) {
      const key = check[1].toLowerCase()
      const value = check[2]
      switch (key) {
        case 'title':
          album.title = value
          break
        case 'gendate':
          album.gendate = value
          break
        case 'gentime':
          album.gentime = value
          break
        case 'song': {
          const maybetitle = TITLE_CHECK.exec(value)
          if (ispresent(maybetitle)) {
            const order = parseFloat(maybetitle[1])
            const title = maybetitle[2]
            const maybesong = findwithorder(order)
            if (ispresent(maybesong)) {
              maybesong.title = title
            } else {
              album.songs.push(createsong(order, title))
            }
          } else {
            const maybeorder = parseFloat(value)
            if (isnumber(maybeorder)) {
              const maybesong = findwithorder(maybeorder)
              if (!ispresent(maybesong)) {
                album.songs.push(createsong(maybeorder, ''))
              }
            }
          }
          break
        }
        case 'songs':
          // ignore
          break
        default:
          // ignore
          break
      }
    } else {
      const maybesong = album.songs[album.songs.length - 1]
      if (ispresent(maybesong) && line.trim().length) {
        maybesong.lines.push(line)
      }
    }
  }

  album.songs.sort((a, b) => a.order - b.order)

  const titles = album.songs.map((song) => song.title)

  const code = `@play_${NAME(album.title).replace(/\W/g, '')}
@cycle 1
@char 14
#end

:touch
"ALBUM: ${escapestring(album.title)}"
"$purple  ${escapestring(album.gendate)}"
"$purple  ${escapestring(album.gentime)}"
${titles.map((title, index) => `!song_${index};${index + 1} ${title || 'untitled'}`).join('\n')}
#end

${album.songs
  .map(
    (song, index) => `:song_${index}
${song.lines.map((line) => `#play ${line}`).join('\n')}
#end
`,
  )
  .join('\n')}
`
  const codepage = createcodepage(code, {})
  const codepagename = codepagereadname(codepage)

  bookwritecodepage(contentbook, codepage)
  apitoast(
    SOFTWARE,
    player,
    `imported zzt zzm file ${codepagename} into ${contentbook.name} book`,
  )
  const name = codepagereadname(codepage)
  const type = codepagereadtypetostring(codepage)
  write(
    SOFTWARE,
    player,
    `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
  )

  const cmd = `#put n ${codepagename}`
  writecopyit(SOFTWARE, player, cmd, cmd, false)
}
