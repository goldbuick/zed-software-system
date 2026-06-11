import { Message } from '@huggingface/transformers'
import { createdevice, createmessage } from 'zss/device'
import { SOFTWARE } from 'zss/device/session'
import { withworkergpulock } from 'zss/feature/gpu/gpuworkerbridge'
import {
  heavyrunagentlist,
  heavyrunagentname,
  heavyrunagentstart,
  heavyrunagentstop,
  heavyrunrestoreagents,
  heavyrunsyncuserdisplay,
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

import { apierror, apilog, vmlastinputtouch, workstatus } from './api'

const activeagents = new Set<string>()

async function executescripttoolcalls(
  player: string,
  agentid: string,
  calls: ParsedScriptToolCall[],
): Promise<Scripttoolresult[]> {
  const results: Scripttoolresult[] = []
  for (let i = 0; i < calls.length; ++i) {
    const call = calls[i]
    try {
      const compiled = (await memoryquery(heavy, agentid, {
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
      const applied = (await memoryquery(heavy, agentid, {
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
  agentid: string,
  commands: string[],
): Promise<void> {
  for (let i = 0; i < commands.length; ++i) {
    if (commands[i].startsWith('#') || commands[i].startsWith('!')) {
      apilog(heavy, player, '$22 command $7', commands[i])
    }
    await memoryquery(heavy, agentid, {
      type: 'runcli',
      command: commands[i],
    })
  }
}

function createonworking(player: string) {
  return (msg: string) => {
    workstatus(heavy, player, msg)
  }
}

async function classifythenmaybeagentprompt(
  player: string,
  messagetext: string,
  agentid: string,
  agentname: string,
  nearestrefid: string,
  nearestrefname: string,
  promptlogging: string,
) {
  const onworking = createonworking(player)
  const nearestcontext = nearestrefid
    ? `Proximity reference: the agent closest to the message sender on this board is "${nearestrefname}" (id: ${nearestrefid}). Use this when the message is vague (e.g. addressing "agent" or "you") to infer who is likely meant, but still answer "none" if the message clearly targets a different agent.\n\n`
    : 'No nearest-agent proximity reference is available.\n\n'

  const classifymessages: Message[] = [
    {
      role: 'system',
      content:
        'You are a message classifier. Answer with exactly one word: movement, action, question, chat, authoring, or none.',
    },
    {
      role: 'user',
      content: `${nearestcontext}Is the following message directed at or relevant to the ai agent named "${agentname}" (id: ${agentid})? If not, answer "none". Otherwise classify the intent as: movement (go, walk, follow, come here, directions), action (shoot, create, change, interact), question (asking about something), chat (conversation), authoring (write or edit ZSS script, codepage, handler, #if logic).\nMessage: "${messagetext}"\nAnswer:`,
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
        agentid,
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
  agentid: string,
  agentname: string,
): Promise<{ context: string; agentinfo: string }> {
  try {
    const data = await memoryquery(heavy, agentid, {
      type: 'boardstate',
    })
    const boarddata = data as Parameters<typeof formatboardfortext>[0]
    return {
      context: stripzsstextcodesforllm(formatboardfortext(boarddata)),
      agentinfo: formatagentinfofortext(boarddata, agentid, agentname),
    }
  } catch {
    return {
      context: 'You are not on any board.',
      agentinfo: `You are ${agentname} (id: ${agentid}). You are not on any board.`,
    }
  }
}

async function runagentprompt(
  player: string,
  agentid: string,
  agentname: string,
  prompt: string,
  onworking: (msg: string) => void,
  _promptlogging: string,
  intent?: string,
) {
  activeagents.add(agentid)
  apilog(heavy, player, '$21 input $7', prompt)

  try {
    await runagentpromptloop(
      player,
      agentid,
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
    vmlastinputtouch(heavy, player, agentid)
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
          if (!isarray(message.data) || message.data.length < 7) {
            return
          }
          const d = message.data
          const prompt = d[0]
          const agentid = d[1]
          const agentname = d[2]
          const nearestrefid = isstring(d[4]) ? d[4] : ''
          const nearestrefname = isstring(d[5]) ? d[5] : ''
          const promptlogging = isstring(d[6]) ? d[6] : ''
          if (!isstring(prompt) || !isstring(agentid) || !isstring(agentname)) {
            return
          }
          workstatus(heavy, message.player, 'llm think')
          await classifythenmaybeagentprompt(
            message.player,
            prompt,
            agentid,
            agentname,
            nearestrefid,
            nearestrefname,
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
      case 'agentname':
        heavyrunagentname(heavy, message)
        break
      case 'syncuserdisplay':
        heavyrunsyncuserdisplay(heavy, message)
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
