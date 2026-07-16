import { registeragentask } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  agentreadsessionpreset,
  agentsetsessionpreset,
} from 'zss/feature/agent/agentloop'
import {
  AGENT_LLM_DEFAULT_PRESET,
  AGENT_LLM_PRESETS,
  AGENT_PLAYER_PRESET_FLAG,
  normalizeagentllmpreset,
} from 'zss/feature/agent/agentpreset'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { write } from 'zss/feature/writeui'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { memoryreadflags } from 'zss/memory/flags'
import { READ_CONTEXT, readargs, readargsuntilend } from 'zss/words/reader'
import { ARG_TYPE, NAME, type WORD } from 'zss/words/types'

function readagentprompt(words: WORD[]): string {
  const [textwords] = readargsuntilend(words, 0, ARG_TYPE.NUMBER_OR_NAME)
  return textwords
    .map((word) => String(word ?? ''))
    .join(' ')
    .trim()
}

function readplayeragentpreset(player: string) {
  const sessionpreset = agentreadsessionpreset(player)
  if (sessionpreset) {
    return sessionpreset
  }
  const flags = memoryreadflags(player)
  return normalizeagentllmpreset(flags[AGENT_PLAYER_PRESET_FLAG])
}

function showagentmodelinfo(player: string) {
  const active = readplayeragentpreset(player) ?? AGENT_LLM_DEFAULT_PRESET
  const lines = Object.entries(AGENT_LLM_PRESETS).map(([key, row]) => {
    const mark = key === active ? '$white*' : '$gray '
    return `${mark}${key}$7 ${row.label}`
  })
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      zssheaderlines('agent'),
      `$gray#agent "prompt"`,
      `$gray#agent model <best|light|experimental>`,
      ...lines,
    ),
  )
}

export function registeragentcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'agent',
    [ARG_TYPE.MAYBE_NAME, 'zedcafe agent prompt or model preset'],
    (_, words) => {
      const [first] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(first)) {
        showagentmodelinfo(player)
        return 0
      }
      if (NAME(first) === 'model') {
        const [presetname] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
        if (isstring(presetname)) {
          const preset = normalizeagentllmpreset(presetname)
          agentsetsessionpreset(player, preset)
          write(SOFTWARE, player, `$greenagent model ${preset}`)
        }
        showagentmodelinfo(player)
        return 0
      }
      const prompt = readagentprompt(words)
      if (!prompt) {
        write(SOFTWARE, player, '$redusage: #agent "prompt"')
        return 0
      }
      const preset = readplayeragentpreset(player)
      registeragentask(SOFTWARE, player, prompt, preset)
      return 0
    },
  )
}
