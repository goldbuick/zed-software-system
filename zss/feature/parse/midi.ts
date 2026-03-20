/**
 * Standard MIDI (.mid) → #play codepage (same layout as imported .zzm: one `:song_0`, many `#play` lines).
 *
 * Diagrams and pipeline: [docs/midi-import.md](docs/midi-import.md).
 *
 * Each bar is one `#play`. Tracks are chosen from the **first four note-ons** in the file (global sort: tick, track index, MIDI pitch); unique tracks among those events get a voice (1–4). Selected GM drum tracks (MIDI ch.10) merge into one drum layer at that order position. Output has at most four `;`-separated voices (`MAX_VOICES_PER_PLAY`).
 * Voices are joined with `"; "` (see `PLAY_VOICE_SEPARATOR` in midiplay). Drum-only files get a leading rest voice on **bar 0 only**
 * (`wx; …`) so that bar’s drums are not assigned to synth channel 0. Melodic voices: `+`/`-` (octave from baseline 3), then
 * duration (`ytsiqhw`), then pitch (`c#`, `b!`). Drums: duration then token (`0`–`9`, `p`, …); rests: duration then `x`.
 * Example (twomeasures.mid, 4/4, two melodic tracks):
 *
 * ```
 * #play +qcdef; wx
 * #play +qgaa#+c; +qefga
 * ```
 */

import { Midi } from '@tonejs/midi'
import { apilog, apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { midiplaysnippetsbymeasure } from 'zss/feature/parse/midiplay'
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
  apilog(SOFTWARE, player, 'parsemidi', file.name)
  const contentbook = memoryreadfirstcontentbook()
  if (!ispresent(contentbook)) {
    const msg = 'no content book to import into'
    apilog(SOFTWARE, player, 'parsemidi', msg)
    apitoast(SOFTWARE, player, msg)
    return
  }

  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch (err: any) {
    const msg = `midi read failed: ${err?.message ?? err}`
    apilog(SOFTWARE, player, 'parsemidi', msg)
    apitoast(SOFTWARE, player, msg)
    return
  }

  let midi: Midi
  try {
    midi = new Midi(buffer)
  } catch (err: any) {
    const msg = `invalid MIDI: ${err?.message ?? err}`
    apilog(SOFTWARE, player, 'parsemidi', msg)
    apitoast(SOFTWARE, player, msg)
    return
  }

  const { snippets: playlines, truncatedbynotes } =
    midiplaysnippetsbymeasure(midi)
  if (truncatedbynotes) {
    apilog(SOFTWARE, player, 'parsemidi', 'truncated (note limit)')
    apitoast(SOFTWARE, player, 'MIDI too large; truncated for import')
  }

  if (!playlines.length) {
    const msg = 'no playable notes found in MIDI'
    apilog(SOFTWARE, player, 'parsemidi', msg)
    apitoast(SOFTWARE, player, msg)
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
!song_0;play
#end

:song_0
${playlines.map((line) => `#play ${line}`).join('\n')}
#end
`
  const codepage = memorycreatecodepage(code, {})
  memorywritecodepage(contentbook, codepage)
  const codepagename = memoryreadcodepagename(codepage)

  const done = `imported MIDI ${codepagename} into ${contentbook.name} book`
  apilog(SOFTWARE, player, 'parsemidi', done)
  apitoast(SOFTWARE, player, done)
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
