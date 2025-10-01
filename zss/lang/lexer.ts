import {
  ITokenConfig,
  Lexer,
  TokenType,
  createToken,
  createTokenInstance,
} from 'chevrotain'
import { LANG_DEV } from 'zss/config'
import { range } from 'zss/mapping/array'
import { isarray } from 'zss/mapping/types'

const all_chars = range(32, 126).map((char) => String.fromCharCode(char))

function createSimpleToken(config: ITokenConfig) {
  return createToken({
    ...config,
    name: `token_${config.name}`,
  })
}

function createWordToken(word: string) {
  return createSimpleToken({
    name: word,
    pattern: new RegExp(word.toLowerCase(), 'i'),
    longer_alt: stringliteral,
  })
}

// Newline & Whitespace

export const newline = createSimpleToken({
  name: 'newline',
  line_breaks: true,
  start_chars_hint: ['\n', '\r'],
  pattern: /\n|\r\n?/,
})

export const whitespace = createSimpleToken({
  name: 'whitespace',
  pattern: / +/,
  group: Lexer.SKIPPED,
})

export const whitespaceandnewline = createSimpleToken({
  name: 'whitespace',
  pattern: /\s+/,
  line_breaks: true,
  group: Lexer.SKIPPED,
})

export const stat = createSimpleToken({
  name: 'stat',
  pattern: /@.*/,
  start_chars_hint: ['@'],
})

export const command = createSimpleToken({
  name: 'command',
  pattern: /#/,
  start_chars_hint: ['#'],
})

let matchTextEnabled = false
const probablynottext = `@#/?':!`
const matchcomplexdir = /^(by|at|away|toward|find|flee|to|cw|ccw|opp|rndp)/i
function matchBasicText(text: string, startOffset: number) {
  if (!matchTextEnabled) {
    return null
  }

  // scan for possible text start
  let cursor = startOffset

  // text can only start at 0, or after a newline or space
  const previous = text[cursor - 1] ?? ''
  if (cursor > 0 && previous !== ' ' && previous !== '\n') {
    return null
  }

  // scan forwards to determine if this is just whitespace
  if (text[cursor] === ' ') {
    while (text[cursor] === ' ') {
      cursor++
    }
    if (probablynottext.includes(text[cursor])) {
      return null
    }
  }

  // scan backwards to check what kind of spot we're in
  while (cursor > 0 && `$"@#':!/?\n`.includes(text[cursor]) === false) {
    cursor--
  }

  switch (text[cursor]) {
    case '?':
    case '/': {
      const prefix = text.substring(cursor + 1, startOffset + 1).toLowerCase()
      const spaceatchar = prefix.indexOf(' ')
      if (spaceatchar < 1 || matchcomplexdir.test(prefix)) {
        // not-okay
        return null
      }
      // okay
      break
    }
    case '#': {
      // not-okay
      return null
    }
    case '"': {
      cursor--
      while (cursor > 0 && text[cursor] === ' ') {
        cursor--
      }
      if (cursor < 1 || text[cursor] === '\n') {
        // is text
      } else {
        // not text
        return null
      }
      break
    }
    case '@':
    case `'`:
    case ':':
    case '!':
      // not-okay
      return null
    case '\n':
      // okay
      break
  }

  // scan until EOL
  let i = startOffset
  if (text[i] === '"') {
    ++i
  }
  while (i < text.length && text[i] !== '\n') {
    i++
  }

  // return match
  const match = text.substring(startOffset, i)

  // do not match empty strings
  if (match.trim().length === 0) {
    return null
  }

  // do not match do
  if (match.toLowerCase() === 'do') {
    return null
  }

  return [match] as RegExpExecArray
}

export const text = createSimpleToken({
  name: 'text',
  pattern: matchBasicText,
  line_breaks: false,
  start_chars_hint: all_chars,
})

export const comment = createSimpleToken({
  name: 'comment',
  pattern: /'.*/,
  start_chars_hint: [`'`],
})

export const label = createSimpleToken({
  name: 'label',
  pattern: /:[^;:\n]*/,
  start_chars_hint: [':'],
})

export const hyperlink = createSimpleToken({
  name: 'hyperlink',
  pattern: /![^;\n]*/,
  start_chars_hint: ['!'],
})

export const hyperlinktext = createSimpleToken({
  name: 'hyperlinktext',
  pattern: /;[^;\n]*/,
  start_chars_hint: [';'],
})

export const stringliteral = createSimpleToken({
  name: 'stringliteral',
  pattern: /[^-0-9"!:;@#/?()\s]+[^-"!:;@#/?()\s]*/,
  start_chars_hint: all_chars,
})

export const stringliteraldouble = createSimpleToken({
  name: 'stringliteraldouble',
  pattern: /"(?:[^\\"]|\\(?:[^\n\r]|u[0-9a-fA-F]{4}))*"/,
})

export const numberliteral = createSimpleToken({
  name: 'numberliteral',
  pattern: /-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
})

// constants and expressions

export const category_isterrain = createWordToken('isterrain')
export const category_isobject = createWordToken('isobject')

export const collision_issolid = createWordToken('issolid')
export const collision_iswalk = createWordToken('iswalk')
export const collision_isswim = createWordToken('isswim')
export const collision_isbullet = createWordToken('isbullet')
export const collision_isghost = createWordToken('isghost')

export const collision_iswalking = createWordToken('iswalking')
export const collision_iswalkable = createWordToken('iswalkable')
export const collision_isswimming = createWordToken('isswimming')
export const collision_isswimmable = createWordToken('isswimmable')

export const color_black = createWordToken('black')
export const color_dkblue = createWordToken('dkblue')
export const color_dkgreen = createWordToken('dkgreen')
export const color_dkcyan = createWordToken('dkcyan')
export const color_dkred = createWordToken('dkred')
export const color_dkpurple = createWordToken('dkpurple')
export const color_dkyellow = createWordToken('dkyellow')
export const color_ltgray = createWordToken('ltgray')
export const color_dkgray = createWordToken('dkgray')
export const color_blue = createWordToken('blue')
export const color_green = createWordToken('green')
export const color_cyan = createWordToken('cyan')
export const color_red = createWordToken('red')
export const color_purple = createWordToken('purple')
export const color_yellow = createWordToken('yellow')
export const color_white = createWordToken('white')

export const color_brown = createWordToken('brown')
export const color_dkwhite = createWordToken('dkwhite')
export const color_ltgrey = createWordToken('ltgrey')
export const color_gray = createWordToken('gray')
export const color_grey = createWordToken('grey')
export const color_dkgrey = createWordToken('dkgrey')
export const color_ltblack = createWordToken('ltblack')

export const color_onblack = createWordToken('onblack')
export const color_ondkblue = createWordToken('ondkblue')
export const color_ondkgreen = createWordToken('ondkgreen')
export const color_ondkcyan = createWordToken('ondkcyan')
export const color_ondkred = createWordToken('ondkred')
export const color_ondkpurple = createWordToken('ondkpurple')
export const color_ondkyellow = createWordToken('ondkyellow')
export const color_onltgray = createWordToken('onltgray')
export const color_ondkgray = createWordToken('ondkgray')
export const color_onblue = createWordToken('onblue')
export const color_ongreen = createWordToken('ongreen')
export const color_oncyan = createWordToken('oncyan')
export const color_onred = createWordToken('onred')
export const color_onpurple = createWordToken('onpurple')
export const color_onyellow = createWordToken('onyellow')
export const color_onwhite = createWordToken('onwhite')

export const color_onbrown = createWordToken('onbrown')
export const color_ondkwhite = createWordToken('ondkwhite')
export const color_onltgrey = createWordToken('onltgrey')
export const color_ongray = createWordToken('ongray')
export const color_ongrey = createWordToken('ongrey')
export const color_ondkgrey = createWordToken('ondkgrey')
export const color_onltblack = createWordToken('onltblack')

export const color_onclear = createWordToken('onclear')

export const color_blblack = createWordToken('blblack')
export const color_bldkblue = createWordToken('bldkblue')
export const color_bldkgreen = createWordToken('bldkgreen')
export const color_bldkcyan = createWordToken('bldkcyan')
export const color_bldkred = createWordToken('bldkred')
export const color_bldkpurple = createWordToken('bldkpurple')
export const color_bldkyellow = createWordToken('bldkyellow')
export const color_blltgray = createWordToken('blltgray')
export const color_bldkgray = createWordToken('bldkgray')
export const color_blblue = createWordToken('blblue')
export const color_blgreen = createWordToken('blgreen')
export const color_blcyan = createWordToken('blcyan')
export const color_blred = createWordToken('blred')
export const color_blpurple = createWordToken('blpurple')
export const color_blyellow = createWordToken('blyellow')
export const color_blwhite = createWordToken('blwhite')

export const color_blbrown = createWordToken('blbrown')
export const color_bldkwhite = createWordToken('bldkwhite')
export const color_blltgrey = createWordToken('blltgrey')
export const color_blgray = createWordToken('blgray')
export const color_blgrey = createWordToken('blgrey')
export const color_bldkgrey = createWordToken('bldkgrey')
export const color_blltblack = createWordToken('blltblack')

export const dir_idle = createWordToken('idle')
export const dir_up = createWordToken('up')
export const dir_down = createWordToken('down')
export const dir_left = createWordToken('left')
export const dir_right = createWordToken('right')
export const dir_by = createWordToken('by')
export const dir_at = createWordToken('at')
export const dir_flow = createWordToken('flow')
export const dir_seek = createWordToken('seek')
export const dir_rndns = createWordToken('rndns')
export const dir_rndne = createWordToken('rndne')
export const dir_rnd = createWordToken('rnd')

export const dir_cw = createWordToken('cw')
export const dir_ccw = createWordToken('ccw')
export const dir_opp = createWordToken('opp')
export const dir_rndp = createWordToken('rndp')

export const dir_away = createWordToken('away')
export const dir_toward = createWordToken('toward')
export const dir_find = createWordToken('find')
export const dir_flee = createWordToken('flee')

export const dir_to = createWordToken('to')

export const dir_i = createWordToken('i')
export const dir_u = createWordToken('u')
export const dir_north = createWordToken('north')
export const dir_n = createWordToken('n')
export const dir_d = createWordToken('d')
export const dir_south = createWordToken('south')
export const dir_s = createWordToken('s')
export const dir_l = createWordToken('l')
export const dir_west = createWordToken('west')
export const dir_w = createWordToken('w')
export const dir_r = createWordToken('r')
export const dir_east = createWordToken('east')
export const dir_e = createWordToken('e')

export const dir_over = createWordToken('over')
export const dir_under = createWordToken('under')
export const dir_ground = createWordToken('ground')
export const dir_within = createWordToken('within')
export const dir_awayby = createWordToken('awayby')

export const expr_aligned = createSimpleToken({
  name: 'expr_aligned',
  pattern: /aligned|alligned/i,
  longer_alt: stringliteral,
})

export const expr_contact = createWordToken('contact')
export const expr_blocked = createWordToken('blocked')
export const expr_any = createWordToken('any')
export const expr_count = createWordToken('countof')
export const expr_abs = createWordToken('abs')
export const expr_intceil = createWordToken('intceil')
export const expr_intfloor = createWordToken('intfloor')
export const expr_intround = createWordToken('intround')
export const expr_clamp = createWordToken('clamp')
export const expr_min = createWordToken('min')
export const expr_max = createWordToken('max')
export const expr_pick = createWordToken('pick')
export const expr_pickwith = createWordToken('pickwith')
export const expr_random = createWordToken('random')
export const expr_randomwith = createWordToken('randomwith')
export const expr_run = createWordToken('run')
export const expr_runwith = createWordToken('runwith')
export const expr_stop = createSimpleToken({
  name: 'stop',
  pattern: /\|/,
  start_chars_hint: ['|'],
})

// comparision

export const iseq = createSimpleToken({
  name: 'iseq',
  pattern: /=|is|eq|equal/i,
  longer_alt: stringliteral,
})
export const isnoteq = createSimpleToken({
  name: 'isnoteq',
  pattern: /!=|not ?eq|not ?equal/i,
  longer_alt: stringliteral,
})
export const islessthan = createSimpleToken({
  name: 'islessthan',
  pattern: /<|below/i,
  longer_alt: stringliteral,
})
export const isgreaterthan = createSimpleToken({
  name: 'isgreaterthan',
  pattern: />|above/i,
  longer_alt: stringliteral,
})
export const islessthanorequal = createSimpleToken({
  name: 'islessthanorequal',
  pattern: /<=|below ?or ?eq|below ?or ?equal/i,
  longer_alt: stringliteral,
})
export const isgreaterthanorequal = createSimpleToken({
  name: 'isgreaterthanorequal',
  pattern: />=|above ?or ?eq|above ?or ?equal/i,
  longer_alt: stringliteral,
})

// logical

export const or = createSimpleToken({
  name: 'or',
  pattern: /or/i,
  longer_alt: stringliteral,
})
export const not = createSimpleToken({
  name: 'not',
  pattern: /not/i,
  longer_alt: stringliteral,
})
export const and = createSimpleToken({
  name: 'and',
  pattern: /and/i,
  longer_alt: stringliteral,
})

// math ops

export const plus = createSimpleToken({ name: 'plus', pattern: /\+/ })
export const minus = createSimpleToken({ name: 'minus', pattern: /-/ })
export const power = createSimpleToken({ name: 'power', pattern: /\*\*/ })
export const multiply = createSimpleToken({ name: 'multiply', pattern: /\*/ })
export const divide = createSimpleToken({ name: 'divide', pattern: /\// })
export const moddivide = createSimpleToken({ name: 'moddivide', pattern: /%/ })
export const floordivide = createSimpleToken({
  name: 'floordivide',
  pattern: /%%/,
})
export const query = createSimpleToken({ name: 'query', pattern: /\?/ })

// grouping

export const lparen = createSimpleToken({
  name: 'lparen',
  pattern: /\(/,
  push_mode: 'ignore_newlines',
})
export const rparen = createSimpleToken({
  name: 'rparen',
  pattern: /\)/,
  pop_mode: true,
})

// media commands

export const command_play = createSimpleToken({
  name: 'command_play',
  pattern:
    /(play|bgplay|bgplayon64n|bgplayon32n|bgplayon16n|bgplayon8n|bgplayon4n|bgplayon2n|bgplayon1n) .*/i,
  start_chars_hint: all_chars,
  longer_alt: stringliteral,
})

export const command_toast = createSimpleToken({
  name: 'command_toast',
  pattern: /toast .*/i,
  start_chars_hint: all_chars,
  longer_alt: stringliteral,
})

export const command_ticker = createSimpleToken({
  name: 'command_ticker',
  pattern: /ticker .*/i,
  start_chars_hint: all_chars,
  longer_alt: stringliteral,
})

// core / structure commands

export const command_if = createSimpleToken({
  name: 'if',
  pattern: /if|try|take|give|duplicate/i,
  longer_alt: stringliteral,
})
export const command_do = createSimpleToken({
  name: 'do',
  pattern: /(?<!(zap |send |restore ))(?<=\s)do/i,
  start_chars_hint: ['d'],
  longer_alt: stringliteral,
})
// export const command_do = createWordToken('do')
export const command_done = createWordToken('done')
export const command_else = createWordToken('else')
export const command_while = createWordToken('while')
export const command_repeat = createWordToken('repeat')
export const command_waitfor = createWordToken('waitfor')
export const command_foreach = createSimpleToken({
  name: 'foreach',
  pattern: /foreach|for/i,
  longer_alt: stringliteral,
})
export const command_break = createWordToken('break')
export const command_continue = createWordToken('continue')

// common error marking
export type LANG_ERROR = {
  offset: number
  line: number | undefined
  column: number | undefined
  length: number
  message: string
}

function createTokenSet(primary: TokenType[], secondary: TokenType[]) {
  return [
    // primary tokens
    ...primary,
    // hack to ensure down / do matching order
    dir_down,
    // secondary tokens
    ...secondary,
    numberliteral,
    // consts and exprs
    category_isterrain,
    category_isobject,
    collision_issolid,
    collision_iswalkable,
    collision_iswalking,
    collision_iswalk,
    collision_isswimmable,
    collision_isswimming,
    collision_isswim,
    collision_isbullet,
    collision_isghost,
    color_black,
    color_dkblue,
    color_dkgreen,
    color_dkcyan,
    color_dkred,
    color_dkpurple,
    color_dkyellow,
    color_ltgray,
    color_dkgray,
    color_blue,
    color_green,
    color_cyan,
    color_red,
    color_purple,
    color_yellow,
    color_white,
    color_brown,
    color_dkwhite,
    color_ltgrey,
    color_gray,
    color_grey,
    color_dkgrey,
    color_ltblack,
    color_onblack,
    color_ondkblue,
    color_ondkgreen,
    color_ondkcyan,
    color_ondkred,
    color_ondkpurple,
    color_ondkyellow,
    color_onltgray,
    color_ondkgray,
    color_onblue,
    color_ongreen,
    color_oncyan,
    color_onred,
    color_onpurple,
    color_onyellow,
    color_onwhite,
    color_onbrown,
    color_ondkwhite,
    color_onltgrey,
    color_ongray,
    color_ongrey,
    color_ondkgrey,
    color_onltblack,
    color_onclear,
    color_blblack,
    color_bldkblue,
    color_bldkgreen,
    color_bldkcyan,
    color_bldkred,
    color_bldkpurple,
    color_bldkyellow,
    color_blltgray,
    color_bldkgray,
    color_blblue,
    color_blgreen,
    color_blcyan,
    color_blred,
    color_blpurple,
    color_blyellow,
    color_blwhite,
    color_blbrown,
    color_bldkwhite,
    color_blltgrey,
    color_blgray,
    color_blgrey,
    color_bldkgrey,
    color_blltblack,
    dir_idle,
    dir_up,
    dir_left,
    dir_right,
    dir_by,
    dir_at,
    dir_flow,
    dir_seek,
    dir_rndp,
    dir_rndns,
    dir_rndne,
    dir_rnd,
    dir_cw,
    dir_ccw,
    dir_opp,
    dir_within,
    dir_awayby,
    dir_away,
    dir_toward,
    dir_find,
    dir_flee,
    dir_to,
    dir_north,
    dir_south,
    dir_west,
    dir_east,
    dir_over,
    dir_under,
    dir_ground,
    expr_aligned,
    expr_contact,
    expr_blocked,
    expr_any,
    expr_count,
    expr_abs,
    expr_intceil,
    expr_intfloor,
    expr_intround,
    expr_clamp,
    expr_min,
    expr_max,
    expr_pickwith,
    expr_pick,
    expr_randomwith,
    expr_random,
    expr_runwith,
    expr_run,
    expr_stop,
    // comparisons
    iseq,
    isnoteq,
    islessthanorequal,
    islessthan,
    isgreaterthanorequal,
    isgreaterthan,
    // logical
    or,
    not,
    and,
    // math ops
    plus,
    minus,
    power,
    multiply,
    divide,
    floordivide,
    moddivide,
    query,
    // grouping
    lparen,
    rparen,
    // consts and exprs
    dir_i,
    dir_u,
    dir_n,
    dir_d,
    dir_s,
    dir_l,
    dir_w,
    dir_r,
    dir_e,
    // content
    stringliteraldouble,
    stringliteral,
  ]
}

export const allTokens = createTokenSet(
  [
    // text output
    text,
    // commands
    stat,
    command_play,
    command_toast,
    command_ticker,
    command,
    // flow
    comment,
    label,
    hyperlink,
    hyperlinktext,
    newline,
    whitespace,
  ],
  [
    // core / structure commands
    command_break,
    command_continue,
    command_done,
    command_do,
    command_else,
    command_foreach,
    command_if,
    command_repeat,
    command_waitfor,
    command_while,
  ],
)

const scriptLexer = new Lexer(
  {
    defaultMode: 'use_newlines',
    modes: {
      use_newlines: allTokens,
      ignore_newlines: createTokenSet([whitespaceandnewline], []),
    },
  },
  {
    skipValidations: !LANG_DEV,
    ensureOptimizations: LANG_DEV,
    positionTracking: 'full',
  },
)

export function tokenize(text: string) {
  matchTextEnabled = true
  const lexResult = scriptLexer.tokenize(text || ' \n')

  // add final new line ?
  const [lastToken] = (isarray(lexResult.tokens) ? lexResult.tokens : []).slice(
    -1,
  )
  if (lastToken && lastToken.tokenType.name !== 'Newline') {
    lexResult.tokens.push(
      createTokenInstance(
        newline,
        '\n',
        lastToken.startOffset,
        lastToken.endOffset ?? NaN,
        lastToken.startLine ?? NaN,
        lastToken.endLine ?? NaN,
        lastToken.startColumn ?? NaN,
        lastToken.endColumn ?? NaN,
      ),
    )
  }

  return lexResult
}
