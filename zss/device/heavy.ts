import { Message } from '@huggingface/transformers'
import { createdevice, createmessage } from 'zss/device'
import { SOFTWARE } from 'zss/device/session'
import { withworkergpulock } from 'zss/feature/gpu/gpuworkerbridge'
import {
  hasagentsession,
  heavyrunagentlist,
  heavyrunagentstart,
  heavyrunagentstop,
  heavyrunrestoreagents,
  readagentdisplayname,
} from 'zss/feature/heavy/agentlifecycle'
import { runagentpromptloop } from 'zss/feature/heavy/agentprompt'
import type { Scripttoolresult } from 'zss/feature/heavy/agentprompt'
import {
  formatagentinfofortext,
  formatboardfortext,
  stripzsstextcodesforllm,
} from 'zss/feature/heavy/formatstate'
import { enqueueheavyjob } from 'zss/feature/heavy/heavyjobqueue'
import type { ParsedScriptToolCall } from 'zss/feature/heavy/llm/scripttool'
import {
  destroysharedmodel,
  modelclassify,
  modelgenerategemma4,
} from 'zss/feature/heavy/model'
import {
  query as memoryquery,
  resolvemessage as memoryqueryresolvemessage,
} from 'zss/feature/heavy/vmquery'
import { resolvestoragepullmessage } from 'zss/feature/storagepull'
import { isarray, isstring } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'

import { apierror, apilog, vmcli, vmlastinputtouch, workstatus } from './api'

const activeagents = new Set<string>()

async function executescripttoolcalls(
  player: string,
  contextplayer: string,
  calls: ParsedScriptToolCall[],
): Promise<Scripttoolresult[]> {
  const results: Scripttoolresult[] = []
  for (let i = 0; i < calls.length; ++i) {
    const call = calls[i]
    try {
      const compiled = (await memoryquery(heavy, contextplayer, {
        type: 'writescript',
        page_id: call.page_id,
        snippet: call.snippet,
        mode: call.mode,
        compile_only: true,
      })) as Scripttoolresult
      if (!compiled.ok) {
        results.push({
          ok: false,
          page_id: call.page_id,
          error: 'compile_failed',
          errors: compiled.errors,
        })
        continue
      }
      const applied = (await memoryquery(heavy, contextplayer, {
        type: 'writescript',
        page_id: call.page_id,
        snippet: call.snippet,
        mode: call.mode,
      })) as Scripttoolresult
      if (applied.ok) {
        apilog(heavy, player, '$22 script $7', `${call.page_id} ${call.mode}`)
      }
      results.push({
        ...applied,
        labels: compiled.labels,
      })
    } catch (err) {
      results.push({
        ok: false,
        page_id: call.page_id,
        error: err instanceof Error ? err.message : 'unknown_error',
      })
    }
  }
  return results
}

async function executeclicommands(
  player: string,
  _contextplayer: string,
  commands: string[],
): Promise<void> {
  for (let i = 0; i < commands.length; ++i) {
    if (commands[i].startsWith('#') || commands[i].startsWith('!')) {
      apilog(heavy, player, '$22 command $7', commands[i])
    }
    vmcli(heavy, player, commands[i])
  }
  await Promise.resolve()
}

function createonworking(player: string) {
  return (msg: string) => {
    workstatus(heavy, player, msg)
  }
}

async function classifythenmaybeagentprompt(
  player: string,
  messagetext: string,
  agentname: string,
  promptlogging: string,
) {
  const onworking = createonworking(player)

  const classifymessages: Message[] = [
    {
      role: 'system',
      content:
        'You are a message classifier. Answer with exactly one word: movement, action, question, chat, authoring, or none.',
    },
    {
      role: 'user',
      content: `Is the following message directed at or relevant to the ai agent named "${agentname}" assisting this player? If not, answer "none". Otherwise classify the intent as: movement (go, walk, follow, come here, directions), action (shoot, create, change, interact), question (asking about something), chat (conversation), authoring (write or edit ZSS script, codepage, handler, #if logic).\nMessage: "${messagetext}"\nAnswer:`,
    },
  ]

  const session = SOFTWARE.session()
  if (!session) {
    return
  }

  await withworkergpulock('heavy', session, async () => {
    const answer = await modelclassify(classifymessages, onworking)
    const intent = answer.split(/\s+/)[0] ?? ''

    if (intent !== 'none') {
      await runagentprompt(
        player,
        agentname,
        messagetext,
        onworking,
        promptlogging,
        intent,
      )
    }
  })
}

async function queryboardstate(
  contextplayer: string,
  agentname: string,
): Promise<{ context: string; agentinfo: string }> {
  try {
    const data = await memoryquery(heavy, contextplayer, {
      type: 'boardstate',
    })
    const boarddata = data as Parameters<typeof formatboardfortext>[0]
    return {
      context: stripzsstextcodesforllm(formatboardfortext(boarddata)),
      agentinfo: formatagentinfofortext(boarddata, contextplayer, agentname),
    }
  } catch {
    return {
      context: 'The player is not on any board.',
      agentinfo: `You are ${agentname}, assisting the player (id: ${contextplayer}). The player is not on any board.`,
    }
  }
}

async function runagentprompt(
  player: string,
  agentname: string,
  prompt: string,
  onworking: (msg: string) => void,
  _promptlogging: string,
  intent?: string,
) {
  activeagents.add(player)
  apilog(heavy, player, '$21 input $7', prompt)

  try {
    await runagentpromptloop(
      player,
      player,
      agentname,
      prompt,
      onworking,
      {
        queryboardstate,
        modelgenerategemma4,
        executeclicommands,
        executescripttoolcalls,
      },
      intent,
    )
  } finally {
    vmlastinputtouch(heavy, player, player)
  }
}

const heavy = createdevice('heavy', [], (message) => {
  if (!heavy.session(message)) {
    return
  }
  perfmeasure(`heavy:${message.target}`, () => {
    switch (message.target) {
      case 'modelprompt':
        enqueueheavyjob(heavy, message.player, async () => {
          if (!hasagentsession(message.player)) {
            return
          }
          if (!isarray(message.data) || message.data.length < 1) {
            return
          }
          const d = message.data
          const prompt = d[0]
          const promptlogging = isstring(d[1]) ? d[1] : ''
          const agentname = readagentdisplayname(message.player)
          if (!isstring(prompt) || !isstring(agentname)) {
            return
          }
          workstatus(heavy, message.player, 'llm think')
          await classifythenmaybeagentprompt(
            message.player,
            prompt,
            agentname,
            promptlogging,
          )
        })
        break
      case 'modelstop':
        if (isstring(message.data)) {
          activeagents.delete(message.data)
          if (activeagents.size === 0) {
            destroysharedmodel()
          }
        }
        break
      case 'disposeifidle': {
        if (activeagents.size === 0) {
          destroysharedmodel()
        }
        const requestid = (message.data as { requestid?: string })?.requestid
        if (isstring(requestid)) {
          self.postMessage(
            createmessage(
              message.session,
              message.player,
              'heavy',
              'platform:heavy:disposeifidle',
              { requestid },
            ),
          )
        }
        break
      }
      case 'llmpreset':
        break
      case 'pilotnotify':
        break
      case 'queryresult':
        memoryqueryresolvemessage(message)
        break
      case 'pullvarresult':
        resolvestoragepullmessage(message.data)
        break
      case 'agentstart':
        heavyrunagentstart(heavy, message)
        break
      case 'agentstop':
        heavyrunagentstop(heavy, message)
        break
      case 'agentlist':
        heavyrunagentlist(heavy, message)
        break
      case 'restoreagents':
        heavyrunrestoreagents(heavy, message)
        break
      default:
        apierror(
          heavy,
          message.player,
          'heavy',
          `unknown message ${message.target}`,
        )
        break
    }
  })
})
