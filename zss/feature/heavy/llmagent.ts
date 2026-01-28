/**
 * Feed acklook data to an LLM and use the response as the next CLI command.
 *
 * Usage:
 *   1. Serialize acklook with formatacklookfortext(data).
 *   2. Send that text plus a system prompt to your LLM (OpenAI, Anthropic, local, etc.).
 *   3. Use the LLM’s reply as the next command: agent.cli(response).
 *
 * The agent must expose cli(input) and look(callback) so it can request the
 * current view and send commands (see agent.ts).
 */
import { ACKLOOK_DATA, AGENT } from 'zss/feature/heavy/agent'
import { formatacklookfortext } from 'zss/feature/heavy/formatacklook'

const DEFAULT_SYSTEM =
  'You are playing a text/grid game. Reply with exactly one CLI command: a single line the game understands (e.g. "n", "s", "e", "w", "take key", "#help"). No explanation, only the command.'

export type LLMCALLER = (
  systemPrompt: string,
  userContent: string,
) => Promise<string>

/**
 * Run one LLM loop: request look, format acklook, call LLM, send response as CLI.
 * Use this inside agent.look() or from a driver that calls agent.look().
 */
export function runllmonce(
  agent: AGENT,
  callllm: LLMCALLER,
  systemPrompt: string = DEFAULT_SYSTEM,
): void {
  if (
    typeof (agent as { look?: (cb?: (d: ACKLOOK_DATA) => void) => void })
      .look !== 'function'
  ) {
    console.warn(
      'llmagent: agent has no look(); ensure agent exposes look(callback)',
    )
    return
  }
  if (typeof (agent as { cli?: (s: string) => void }).cli !== 'function') {
    console.warn(
      'llmagent: agent has no cli(); ensure agent exposes cli(input)',
    )
    return
  }

  ;(agent as { look: (cb?: (d: ACKLOOK_DATA) => void) => void }).look(
    (data: ACKLOOK_DATA) => {
      const text = formatacklookfortext(data)
      callllm(systemPrompt, text)
        .then((reply) => {
          const cmd = reply.trim().split('\n')[0] ?? ''
          if (cmd) {
            ;(agent as { cli: (s: string) => void }).cli(cmd)
          }
        })
        .catch((err) => {
          console.error('llmagent: LLM call failed', err)
        })
    },
  )
}

/**
 * Build an LLM caller for an OpenAI-style chat API (e.g. OpenAI, local proxy).
 * Pass your API key via headers or in the URL for local models.
 *
 * @param url - Chat completions endpoint (e.g. "https://api.openai.com/v1/chat/completions")
 * @param getHeaders - Optional () => Record<string, string> for Authorization, etc.
 */
export function createopenailikecaller(
  url: string,
  getHeaders?: () => Record<string, string>,
): LLMCALLER {
  return async (systemPrompt: string, userContent: string): Promise<string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getHeaders?.(),
    }
    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 64,
      temperature: 0.2,
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`LLM API ${res.status}: ${t}`)
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json.choices?.[0]?.message?.content
    return typeof content === 'string' ? content : ''
  }
}
