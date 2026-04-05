import {
  apierror,
  heavyagentlist,
  heavyagentstart,
  heavyagentstop,
  heavyllmpreset,
  registerstore,
} from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import {
  HEAVY_LLM_PRESETS,
  HEAVY_LLM_STORAGE_KEY,
  heavylmpresetids,
  normalizeheavylmpreset,
  resolveheavylmpresetfromsources,
} from 'zss/feature/heavy/heavyllmpreset'
import { pullstoragevarfrommain } from 'zss/feature/storagepull'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import {
  zssheaderlines,
  zsstexttape,
  zsszedlinklines,
} from 'zss/feature/zsstextui'
import { FIRMWARE } from 'zss/firmware'
import { doasync } from 'zss/mapping/func'
import { ispresent, isstring } from 'zss/mapping/types'
import { READ_CONTEXT, readargs } from 'zss/words/reader'
import { ARG_TYPE, NAME } from 'zss/words/types'

function showheavylmpresetmenu(player: string) {
  doasync(SOFTWARE, player, async () => {
    const stored = await pullstoragevarfrommain(
      SOFTWARE,
      player,
      HEAVY_LLM_STORAGE_KEY,
      'vm',
    )
    const effective = resolveheavylmpresetfromsources(stored)
    const ids = heavylmpresetids()
    const linklines = zsszedlinklines(
      ids.map((id) => {
        const row = HEAVY_LLM_PRESETS[id]
        const cmd = `#agent model ${id}`
        const iscurrent = id === effective
        return {
          command: `runit ${cmd}`,
          label: iscurrent
            ? `$green ${id}$white ${row.modelid} $gray(active)`
            : `$white ${id} ${row.modelid}`,
        }
      }),
    )
    terminalwritelines(
      SOFTWARE,
      player,
      zsstexttape(
        zssheaderlines('model selection'),
        `$grayCurrent$white $cyan${effective}$white $7 $grayEnter on a row to switch$white`,
        linklines,
      ),
    )
  })
}

export function registeragentcommands(fw: FIRMWARE): FIRMWARE {
  return fw.command(
    'agent',
    [
      ARG_TYPE.MAYBE_NAME,
      'bare: agents + model picker; start/stop/model AI agents (#agent model = !runit menu)',
    ],
    (_, words) => {
      const [action] = readargs(words, 0, [ARG_TYPE.MAYBE_NAME])
      const player = READ_CONTEXT.elementfocus
      if (!ispresent(action)) {
        heavyagentlist(SOFTWARE, player)
        showheavylmpresetmenu(player)
        return 0
      }
      switch (NAME(action)) {
        case 'model': {
          const [maybepreset] = readargs(words, 1, [ARG_TYPE.MAYBE_NAME])
          const raw = NAME(maybepreset)
          if (raw === '') {
            showheavylmpresetmenu(player)
          } else {
            const p = normalizeheavylmpreset(raw)
            if (!p) {
              apierror(SOFTWARE, player, 'agent', '#agent model | llama | tiny')
            } else {
              registerstore(SOFTWARE, player, HEAVY_LLM_STORAGE_KEY, p)
              heavyllmpreset(SOFTWARE, player, p)
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
        default:
          heavyagentlist(SOFTWARE, READ_CONTEXT.elementfocus)
          break
      }
      return 0
    },
  )
}
