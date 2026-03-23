import {
  apierror,
  heavyagentlist,
  heavyagentstart,
  heavyagentstop,
  heavyllmpreset,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  HEAVY_LLM_STORAGE_KEY,
  normalizeheavylmpreset,
  resolveheavylmpresetfromsources,
} from 'zss/feature/heavy/heavyllmpreset'
import { storagereadvars, storagewritevar } from 'zss/feature/storage'
import { write } from 'zss/feature/writeui'
import { FIRMWARE } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

export function registeragentcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'agent',
    [ARG_TYPE.MAYBE_NAME, 'start/stop/list/model AI agents'],
    (_, words) => {
      const [action] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      switch (NAME(action)) {
        case 'model': {
          const [maybepreset] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
          const raw = NAME(maybepreset)
          const player = READ_CONTEXT.elementfocus
          if (raw === '') {
            doasync(SOFTWARE, player, async () => {
              const vars = await storagereadvars()
              const effective = resolveheavylmpresetfromsources(
                vars[HEAVY_LLM_STORAGE_KEY],
              )
              write(SOFTWARE, player, `heavy llm preset: ${effective}`)
            })
          } else {
            const p = normalizeheavylmpreset(raw)
            if (!p) {
              apierror(SOFTWARE, player, 'agent', '#agent model llama|phi|qwen')
            } else {
              doasync(SOFTWARE, player, async () => {
                await storagewritevar(HEAVY_LLM_STORAGE_KEY, p)
                heavyllmpreset(SOFTWARE, player, p)
              })
            }
          }
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
        case '':
        case 'list':
        default:
          heavyagentlist(SOFTWARE, READ_CONTEXT.elementfocus)
          break
      }
      return 0
    },
  )
}
