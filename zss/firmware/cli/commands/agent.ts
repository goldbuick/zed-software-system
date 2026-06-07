import {
  apierror,
  heavyagentlist,
  heavyagentstart,
  heavyagentstop,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { HEAVY_LLM_PRESETS } from 'zss/feature/heavy/heavyllmpreset'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { ispresent, isstring } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function showagentmodelinfo(player: string) {
  const row = HEAVY_LLM_PRESETS.gemma
  terminalwritelines(
    SOFTWARE,
    player,
    zsstexttape(
      zssheaderlines('agent model'),
      `$grayAgent LLM$white Gemma 4 E2B (in-browser only)`,
      `$7 ${row.modelid}`,
      `$grayWebGPU q4f16 · tool calling via run_zss_command`,
    ),
  )
}

export function registeragentcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'agent',
    [
      ARG_TYPE.MAYBE_NAME,
      'bare: agents; start/stop AI agents (Gemma 4 E2B in-browser)',
    ],
    (_, words) => {
      const [action] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(action)) {
        heavyagentlist(SOFTWARE, player)
        showagentmodelinfo(player)
        return 0
      }
      switch (NAME(action)) {
        case 'model': {
          showagentmodelinfo(player)
          break
        }
        case 'start': {
          const [agentname] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
          heavyagentstart(
            SOFTWARE,
            READ_CONTEXT.elementfocus,
            isstring(agentname) ? agentname : undefined,
          )
          break
        }
        case 'stop': {
          const [agentid] = readargs(words, 1, [ARG_TYPE.NAME])
          if (ispresent(agentid)) {
            heavyagentstop(SOFTWARE, READ_CONTEXT.elementfocus, agentid)
          } else {
            apierror(
              SOFTWARE,
              READ_CONTEXT.elementfocus,
              'agent',
              '#agent stop <id>',
            )
          }
          break
        }
        default:
          heavyagentlist(SOFTWARE, READ_CONTEXT.elementfocus)
          break
      }
      return 0
    },
  )
}
