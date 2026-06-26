/** Hand-written user intents for parity fixture snippets (ground truth). */
export const PARITY_USER_PROMPTS: Record<string, string> = {
  empty: 'Create an empty codepage handler with no logic',
  if_break: 'Break out of an if when condition is true',
  while_break: 'Break out of a while loop immediately',
  repeat_break: 'Break out of a repeat loop on first iteration',
  short_go: 'Go to a label with a blocking move',
  short_try: 'Try a non-blocking move to a label',
  divide: 'Check if one divided by two in an if',
  paren_multiline: 'If a multiline parenthesized sum is truthy',
  pick: 'If pick chooses among a b c',
  comparison_chain: 'If a chained comparison 1 < 2 < 3 holds',
  label_goto: 'Define label a and go to it',
  stat_line: 'Set score stat to 10',
  text_line: 'Display plain text hello world',
  command: 'Die immediately',
  foreach: 'Foreach x in a b then break',
  while_push_by: 'While p1 not 8, if p1 is 0 push by -1 1 up then give p1',
  duplicate_fork: 'If true duplicate with fork else bgplay b',
  send_dir_label:
    'Send north to calcdisplay; if any line to the north set p1 bit 1',
  paren_intround: 'Set p1 to intround p1 modulo 4',
}

/** Snippets held out for eval (not in train.jsonl). */
export const EVAL_SNIPPET_IDS = new Set([
  'send_dir_label',
  'short_try',
  'if_break',
  'while_break',
  'foreach',
  'comparison_chain',
  'duplicate_fork',
  'pick',
  'paren_intround',
  'repeat_break',
  'while_push_by',
])

/** Negative training pairs: user asks for invalid syntax; assistant refuses in plain text. */
export const NEGATIVE_TRAIN_PAIRS: { user: string; assistant: string }[] = [
  {
    user: 'Write Python if x == 1 for the object',
    assistant:
      'I write ZSS script, not Python. Use #if with ZSS comparisons like #if x is 1.',
  },
  {
    user: 'Add play notation hC4 for a melody',
    assistant:
      'Use ROM play style like +hc for half C4, not hC4 — digit 4 is a drum in #play.',
  },
  {
    user: 'Write an if block but skip #done',
    assistant:
      'Block ifs need #do … #done. Inline ifs can be one line like #if 1 #die.',
  },
]
