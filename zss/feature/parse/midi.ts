/**
 * Standard MIDI (.mid) → ZZT-style #play codepage (multi-voice via `;`, see parseplay).
 */

import { Midi } from '@tonejs/midi'
import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { midivoicesfrommidi } from 'zss/feature/parse/midiplay'
import { write, writecopyit } from 'zss/feature/writeui'
import { ispresent } from 'zss/mapping/types'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagename,
  memoryreadcodepagetypeasstring,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import { NAME } from 'zss/words/types'

function escapestring(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export async function parsemidi(player: string, file: File) {
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    apitoast(SOFTWARE, player, 'no content book to import into')
    return
  }

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch (err: any) {
    apitoast(SOFTWARE, player, `midi read failed: ${err?.message ?? err}`)
    return
  }

  let midi: Midi
  try {
    midi = new Midi(buffer)
  } catch (err: any) {
    apitoast(SOFTWARE, player, `invalid MIDI: ${err?.message ?? err}`)
    return
  }

  const { voices, truncatedbynotes } = midivoicesfrommidi(midi)
  if (truncatedbynotes) {
    apitoast(SOFTWARE, player, 'MIDI too large; truncated for import')
  }

  if (!voices.length) {
    apitoast(SOFTWARE, player, 'no playable notes found in MIDI')
    return
  }

  const albumtitle = file.name.replace(/\.mid$/i, '') || 'midi'
  const id = NAME(albumtitle).replace(/\W/g, '')
  const code = `@play_${id}
@cycle 1
@char 14
#end

:touch
"MIDI: ${escapestring(albumtitle)}"
${voices.map((_, i) => `!song_${i};${i + 1} voice ${i + 1}`).join('\n')}
#end

${voices
  .map(
    (v, index) => `:song_${index}
#play ${v}
#end
`,
  )
  .join('\n')}
`
  const codepage = memorycreatecodepage(code, {})
  memorywritecodepage(contentbook, codepage)
  const codepagename = memoryreadcodepagename(codepage)

  apitoast(
    SOFTWARE,
    player,
    `imported MIDI ${codepagename} into ${contentbook.name} book`,
  )
  const name = memoryreadcodepagename(codepage)
  const type = memoryreadcodepagetypeasstring(codepage)
  write(
    SOFTWARE,
    player,
    `!pageopen ${codepage.id};$blue[${type}]$white ${name}`,
  )
  const cmd = `#put n ${codepagename}`
  writecopyit(SOFTWARE, player, cmd, cmd, false)
}
