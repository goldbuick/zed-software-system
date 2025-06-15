import * as lexer from 'zss/lang/lexer'
import { COLOR } from 'zss/words/types'

export const ZSS_TYPE_NONE = COLOR.WHITE
export const ZSS_TYPE_TEXT = COLOR.GREEN
export const ZSS_TYPE_SYMBOL = COLOR.YELLOW
export const ZSS_TYPE_COMMENT = COLOR.CYAN
export const ZSS_TYPE_COMMAND = COLOR.DKGREEN
export const ZSS_TYPE_BLOCK = COLOR.DKCYAN
export const ZSS_TYPE_MUSIC = COLOR.GREEN
export const ZSS_TYPE_STATNAME = COLOR.DKPURPLE
export const ZSS_TYPE_NUMBER = COLOR.WHITE
export const ZSS_TYPE_LINE = COLOR.LTGRAY
export const ZSS_TYPE_ERROR = COLOR.DKGRAY
export const ZSS_TYPE_ERROR_LINE = COLOR.DKRED

export const ZSS_TYPE_LABEL = COLOR.DKRED
export const ZSS_TYPE_FLAGMOD = COLOR.DKYELLOW

export const ZSS_COLOR_MAP: Record<number, COLOR> = {
  [lexer.newline.tokenTypeIdx ?? 0]: ZSS_TYPE_NONE,
  [lexer.whitespace.tokenTypeIdx ?? 0]: ZSS_TYPE_NONE,
  [lexer.whitespaceandnewline.tokenTypeIdx ?? 0]: ZSS_TYPE_NONE,
  [lexer.stat.tokenTypeIdx ?? 0]: ZSS_TYPE_STATNAME,
  [lexer.command.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.text.tokenTypeIdx ?? 0]: ZSS_TYPE_TEXT,
  [lexer.comment.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMENT,
  [lexer.label.tokenTypeIdx ?? 0]: ZSS_TYPE_LABEL,
  [lexer.hyperlink.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.hyperlinktext.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.stringliteral.tokenTypeIdx ?? 0]: ZSS_TYPE_TEXT,
  [lexer.stringliteraldouble.tokenTypeIdx ?? 0]: ZSS_TYPE_TEXT,
  [lexer.numberliteral.tokenTypeIdx ?? 0]: ZSS_TYPE_NUMBER,
  [lexer.iseq.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.isnoteq.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.islessthan.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.isgreaterthan.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.islessthanorequal.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.isgreaterthanorequal.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.or.tokenTypeIdx ?? 0]: ZSS_TYPE_FLAGMOD,
  [lexer.not.tokenTypeIdx ?? 0]: ZSS_TYPE_FLAGMOD,
  [lexer.and.tokenTypeIdx ?? 0]: ZSS_TYPE_FLAGMOD,
  [lexer.plus.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.minus.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.power.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.multiply.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.divide.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.moddivide.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.floordivide.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.query.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.lparen.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.rparen.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.command_play.tokenTypeIdx ?? 0]: ZSS_TYPE_MUSIC,
  [lexer.command_if.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_do.tokenTypeIdx ?? 0]: ZSS_TYPE_BLOCK,
  [lexer.command_done.tokenTypeIdx ?? 0]: ZSS_TYPE_BLOCK,
  [lexer.command_else.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_while.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_repeat.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_waitfor.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_foreach.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_break.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_continue.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
}

export const ZSS_WORD_MESSAGE = COLOR.DKPURPLE
export const ZSS_WORD_FLAG = COLOR.DKYELLOW
export const ZSS_WORD_STAT = COLOR.DKPURPLE
export const ZSS_WORD_KIND = COLOR.CYAN
export const ZSS_WORD_KIND_ALT = COLOR.DKCYAN
export const ZSS_WORD_COLOR = COLOR.RED
export const ZSS_WORD_DIR = COLOR.WHITE
export const ZSS_WORD_DIRMOD = COLOR.LTGRAY
export const ZSS_WORD_EXPRS = COLOR.YELLOW

const ZSS_WORD_MAP = new Map<string, COLOR>()

export function zsswordcolorconfig(word: string, color: COLOR) {
  ZSS_WORD_MAP.set(word, color)
}

enum COLOR_MODE {
  NEEDS_SETUP,
  NOTES,
  MESSAGE,
}

function zssplaywordcolor(word: string) {
  const colors: COLOR[] = []
  let isnotes = COLOR_MODE.NEEDS_SETUP
  for (let i = 0; i < word.length; ++i) {
    switch (word[i]) {
      case ';':
        isnotes = COLOR_MODE.NEEDS_SETUP
        break
      case ' ':
        // skip changing COLOR_MODE
        break
      default:
        if (isnotes === COLOR_MODE.NEEDS_SETUP) {
          isnotes = COLOR_MODE.NOTES
        }
        break
      case '#':
        if (isnotes === COLOR_MODE.NEEDS_SETUP) {
          isnotes = COLOR_MODE.MESSAGE
        }
        break
    }
    switch (isnotes) {
      case COLOR_MODE.NEEDS_SETUP:
        colors.push(COLOR.LTGRAY)
        break
      case COLOR_MODE.NOTES:
        colors.push(zssmusiccolor(word[i]))
        break
      case COLOR_MODE.MESSAGE:
        colors.push(COLOR.CYAN)
        break
    }
  }
  colors.push(COLOR.BLUE)
  return colors
}

export function zsswordcolor(word: string) {
  if (word.startsWith('play ')) {
    const colors: COLOR[] = new Array<COLOR>(5).fill(ZSS_TYPE_COMMAND)
    colors.push(...zssplaywordcolor(word.slice(5)))
    return colors
  } else if (word.startsWith('bgplay ')) {
    const colors: COLOR[] = new Array<COLOR>(7).fill(ZSS_TYPE_COMMAND)
    colors.push(...zssplaywordcolor(word.slice(7)))
    return colors
  }
  return ZSS_WORD_MAP.get(word) ?? COLOR.GREEN
}

// have to parse command_play string for these
export const ZSS_MUSIC_NOTE = COLOR.GREEN
export const ZSS_MUSIC_REST = COLOR.DKGREEN
export const ZSS_MUSIC_DRUM = COLOR.PURPLE
export const ZSS_MUSIC_TIME = COLOR.DKCYAN
export const ZSS_MUSIC_TIMEMOD = COLOR.CYAN
export const ZSS_MUSIC_OCTAVE = COLOR.YELLOW
export const ZSS_MUSIC_PITCH = COLOR.DKYELLOW

const ZSS_MUSIC_MAP = new Map<string, COLOR>()

export function zssmusiccolorconfig(music: string, color: COLOR) {
  ZSS_MUSIC_MAP.set(music, color)
}

export function zssmusiccolor(music: string) {
  return ZSS_MUSIC_MAP.get(music) ?? COLOR.GREEN
}
