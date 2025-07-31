import { api_toast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { MAYBE, isnumber, ispresent } from 'zss/mapping/types'
import { memoryreadfirstcontentbook } from 'zss/memory'
import { bookwritecodepage } from 'zss/memory/book'
import { codepagereadname, createcodepage } from 'zss/memory/codepage'
import { NAME } from 'zss/words/types'

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
"${escapestring(album.gendate)}"
"${escapestring(album.gentime)}"
${titles.map((title, index) => `!song_${index};${index + 1}${title}`).join('\n')}
#end
${album.songs
  .map(
    (song, index) => `:song_${index}
${song.lines.join('\n')}
#end
`,
  )
  .join('\n')}
`
  const codepage = createcodepage(code, {})
  const codepagename = codepagereadname(codepage)

  bookwritecodepage(contentbook, codepage)
  api_toast(
    SOFTWARE,
    player,
    `imported zzt zzm file ${codepagename} into ${contentbook.name} book`,
  )

  console.info(code)
}
/*
; ZZT Music File v1.0
; $TITLE /frozen/~soundtrack~-~by~coolzx
; $GENDATE 11-20-1999
; $GENTIME 15:21:15
; $SONGS BEGIN
; $SONG TITLE 1 i2~i2~by:~coolzx
; $SONG 1
i-D#D#DDDC#C#C#DDDD#
i-D#D#DDDC#C#C#D#D#D
i-DC#C#D#D#DDC#C#D#D
i-C#D#DC#D#DC#CCCCC
i-CCF#CCCCCCCF#CCC
i-CCCCF#CCCCCCCF#
i-D#DC#D#DCCD#DC#D#D
i-CCDDEEDDC#C#DDEE
i-DDC#C#D#DC#D#DC#D#
i-DCD#DCD#DC#D#DCD#
i-DCD#D-B+D#D-A+D#D-B
i-D#DCD#DC#D#DC#D#D-E
i--EEEE
; $SONG ENDS
; $SONG TITLE 2 rock~n'roll~by:~coolzx
; $SONG 2
iA#A#A#A#AAG#G#A#A#A#
iA#AAG#G#A#A#A#A#AAG#
iG#A#A#A#A#AAG#G#G#G#
iG#G#GGF#F#G#G#G#G#G
iGF#F#G#G#G#G#GGG#G#
iAAA#A#A#A#AAAG#G#G#
iG#A#A#A#AAAG#G#G#G#
iGGGGFFFFEEEED#D#
iD#D#EEEEFFFFEEEE
iD#D#D#D#EEEEF#F#FF
iEEFFF#F#FFEEFF-GG
; $SONG ENDS
*/
