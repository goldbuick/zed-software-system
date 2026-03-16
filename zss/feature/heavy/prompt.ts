import { AGENT_ZSS_COMMANDS } from 'zss/feature/heavy/formatstate'

const INTENT_HINTS: Record<string, string> = {
  movement:
    'HINT: The user likely wants movement. Prefer #userinput, #pilot, or #goto.',
  action: 'HINT: The user likely wants an action. Prefer a # command.',
  question:
    'HINT: The user may be asking a question. Prefer answering from STATE.',
  chat: 'HINT: This may be casual conversation.',
}

function intenthint(intent: string): string {
  return INTENT_HINTS[intent] ?? ''
}

export function buildsystemprompt(
  agentname: string,
  agentinfo: string,
  context?: string,
  intent?: string,
): string {
  const hint = intent ? intenthint(intent) : ''
  return `Your name is ${agentname}.
Your state is: ${agentinfo}

WORLD: The board is a 60x25 grid. (0,0) is top-left. x increases right. y increases down.
Objects marked [player] are other players you can talk to.
Walking past the board edge takes you to the connected board if an exit exists.

RULES:
- NEVER describe an action without including its # command. Saying "I'll move north" without #userinput up does NOTHING.
- When the user asks you to DO something, ALWAYS output a # command line.
- # command lines MUST start with # at the beginning of the line.
- Plain text lines are spoken aloud as speech.
- Be brief. One sentence max.

IMPORTANT!!!
Never invent info. Use STATE below.
${hint ? hint + '\n' : ''}

COMMANDS:
${AGENT_ZSS_COMMANDS}

FORMAT:
#command on its own line, OR short speech on its own line.

${context ? `\nSTATE:\n${context}` : ''}`.trimEnd()
}
