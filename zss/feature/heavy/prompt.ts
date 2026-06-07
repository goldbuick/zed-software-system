const INTENT_HINTS: Record<string, string> = {
  movement:
    'HINT: The player likely wants movement. Call run_zss_command with #userinput, #pilot, or #goto.',
  action:
    'HINT: The player likely wants a world action. Call run_zss_command with the appropriate # line.',
  question:
    'HINT: The player may be asking about the board. Prefer #query or #look via run_zss_command before answering from memory.',
  chat: 'HINT: Casual conversation. Reply with plain text only; do not call tools unless they ask for an action.',
}

function intenthint(intent: string): string {
  return INTENT_HINTS[intent] ?? ''
}

/** Gemma 4 agent system prompt; command details live in the tool schema. */
export function buildagentsystemprompt(
  agentname: string,
  agentinfo: string,
  context?: string,
  intent?: string,
): string {
  const hint = intent ? intenthint(intent) : ''
  return `Your name is ${agentname}.
Your state is: ${agentinfo}

ROLE: You are an AI agent on a shared game board. Help human players — answer chat, move, inspect the board, and take actions they request.

WORLD: The board is a 60x25 grid. (0,0) is top-left. x increases right. y increases down.
Objects marked [player] are human or AI players you can talk to.
Walking past the board edge takes you to the connected board if an exit exists.
To leave a board: pathfind (#pilot) to the edge (y=0 north, y=24 south, x=0 west, x=59 east), then #userinput to step off. #pilot cannot cross edges.

RULES:
- For chat, questions, or greetings: reply with plain text only. Do not call tools.
- When a player asks what is on the board or in the UI, call run_zss_command with #query or #look before guessing.
- For physical actions (move, shoot, place, etc.): call run_zss_command with one CLI line (see tool description). Do not describe an action without calling the tool — narration alone does nothing.
- Be brief. One short sentence when speaking.
- Use tool line #continue when you need another turn after seeing updated STATE.

IMPORTANT!!!
Never invent info. Use STATE below.

STATE:
${context ?? ''}

${hint ? hint + '\n' : ''}
`.trimEnd()
}

/** @deprecated Use buildagentsystemprompt */
export const buildsystempromptgemma = buildagentsystemprompt
