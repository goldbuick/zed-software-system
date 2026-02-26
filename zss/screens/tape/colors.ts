import type { IToken } from 'chevrotain'
import * as lexer from 'zss/lang/lexer'
import { clamp } from 'zss/mapping/number'
import { isarray, ispresent } from 'zss/mapping/types'
import { statformat } from 'zss/words/stats'
import {
  type WRITE_TEXT_CONTEXT,
  clippedapplycolortoindexes,
} from 'zss/words/textformat'
import { COLOR, STAT_TYPE } from 'zss/words/types'

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
export const ZSS_TYPE_COLOR = COLOR.RED
export const ZSS_TYPE_DIR = COLOR.WHITE
export const ZSS_TYPE_DIR_MOD = COLOR.LTGRAY

// ---------------------------------------------------------------------------
// Editor UI (cursor, remote presence)
// ---------------------------------------------------------------------------
export const ZSS_CURSOR_BG = COLOR.DKBLUE
export const ZSS_REMOTE_CURSOR_FG = COLOR.WHITE
export const ZSS_REMOTE_CURSOR_BG = COLOR.CYAN
export const ZSS_REMOTE_SELECTION_FG = COLOR.BLACK
export const ZSS_REMOTE_SELECTION_BG = COLOR.DKGRAY

// ---------------------------------------------------------------------------
// Tape UI (shared by editor frame, terminal, log)
// ---------------------------------------------------------------------------
export const FG = COLOR.BLUE
export const FG_SELECTED = COLOR.WHITE
export const BG_SELECTED = COLOR.DKGRAY
export const BG_ACTIVE = COLOR.BLACK

export function bgcolor(quickterminal: boolean) {
  return quickterminal ? COLOR.ONCLEAR : COLOR.DKBLUE
}

// ---------------------------------------------------------------------------
// Token type -> color map (editor and terminal syntax highlighting)
// One explicit typed entry per lexer token type.
// ---------------------------------------------------------------------------
export const ZSS_COLOR_MAP: Record<number, COLOR> = {
  // whitespace
  [lexer.newline.tokenTypeIdx ?? 0]: ZSS_TYPE_NONE,
  [lexer.whitespace.tokenTypeIdx ?? 0]: ZSS_TYPE_NONE,
  [lexer.whitespaceandnewline.tokenTypeIdx ?? 0]: ZSS_TYPE_NONE,
  // structure
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
  // comparisons
  [lexer.iseq.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.isnoteq.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.islessthan.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.isgreaterthan.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.islessthanorequal.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.isgreaterthanorequal.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  // logical
  [lexer.or.tokenTypeIdx ?? 0]: ZSS_TYPE_FLAGMOD,
  [lexer.not.tokenTypeIdx ?? 0]: ZSS_TYPE_FLAGMOD,
  [lexer.and.tokenTypeIdx ?? 0]: ZSS_TYPE_FLAGMOD,
  // math ops
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
  // commands
  [lexer.command_play.tokenTypeIdx ?? 0]: ZSS_TYPE_MUSIC,
  [lexer.command_ticker.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
  [lexer.command_toast.tokenTypeIdx ?? 0]: ZSS_TYPE_COMMAND,
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
  // category queries
  [lexer.category_isterrain.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.category_isobject.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  // collision queries
  [lexer.collision_issolid.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_iswalk.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_isswim.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_isbullet.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_isghost.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_iswalking.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_iswalkable.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_isswimming.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.collision_isswimmable.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  // fg colors
  [lexer.color_black.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkblue.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkgreen.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkcyan.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkred.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkpurple.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkyellow.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ltgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blue.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_green.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_cyan.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_red.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_purple.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_yellow.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_white.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_brown.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkwhite.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ltgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_gray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_grey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_dkgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ltblack.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  // bg colors
  [lexer.color_onblack.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkblue.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkgreen.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkcyan.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkred.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkpurple.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkyellow.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onltgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onblue.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ongreen.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_oncyan.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onred.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onpurple.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onyellow.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onwhite.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onbrown.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkwhite.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onltgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ongray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ongrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_ondkgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onltblack.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_onclear.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  // blink colors
  [lexer.color_blblack.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkblue.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkgreen.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkcyan.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkred.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkpurple.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkyellow.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blltgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blblue.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blgreen.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blcyan.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blred.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blpurple.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blyellow.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blwhite.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blbrown.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkwhite.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blltgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blgray.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_bldkgrey.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  [lexer.color_blltblack.tokenTypeIdx ?? 0]: ZSS_TYPE_COLOR,
  // directions
  [lexer.dir_idle.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_up.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_down.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_left.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_right.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_flow.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_seek.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_rnd.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_rndns.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_rndne.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_north.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_south.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_west.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_east.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_over.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_under.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_ground.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_within.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_elements.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_select.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_i.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_u.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_n.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_d.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_s.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_l.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_w.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_r.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  [lexer.dir_e.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR,
  // direction modifiers
  [lexer.dir_by.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_at.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_cw.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_ccw.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_opp.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_rndp.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_away.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_toward.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_find.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_flee.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_to.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  [lexer.dir_awayby.tokenTypeIdx ?? 0]: ZSS_TYPE_DIR_MOD,
  // expressions
  [lexer.expr_aligned.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_contact.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_blocked.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_any.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_count.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_abs.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_intceil.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_intfloor.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_intround.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_clamp.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_min.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_max.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_pick.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_pickwith.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_random.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_randomwith.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_run.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_runwith.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
  [lexer.expr_stop.tokenTypeIdx ?? 0]: ZSS_TYPE_SYMBOL,
}

export const ZSS_WORD_MESSAGE = COLOR.DKPURPLE
export const ZSS_WORD_FLAG = COLOR.PURPLE
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

const PLAY_COMMAND_RE =
  /^(play|bgplay|bgplayon64n|bgplayon32n|bgplayon16n|bgplayon8n|bgplayon4n|bgplayon2n|bgplayon1n) /i

export function zsswordcolor(word: string) {
  const match = PLAY_COMMAND_RE.exec(word)
  if (match) {
    const cmdlen = match[1].length
    const colors: COLOR[] = new Array<COLOR>(cmdlen).fill(ZSS_TYPE_COMMAND)
    colors.push(...zssplaywordcolor(word.slice(cmdlen)))
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

export function zssmusiccolor(music: string) {
  return ZSS_MUSIC_MAP.get(music) ?? COLOR.GREEN
}

// static colors for music notes
ZSS_MUSIC_MAP.set('a', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('b', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('c', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('d', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('e', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('f', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('g', ZSS_MUSIC_NOTE)
ZSS_MUSIC_MAP.set('x', ZSS_MUSIC_REST)
ZSS_MUSIC_MAP.set('#', ZSS_MUSIC_PITCH)
ZSS_MUSIC_MAP.set('!', ZSS_MUSIC_PITCH)
ZSS_MUSIC_MAP.set('y', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('t', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('s', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('i', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('q', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('h', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('w', ZSS_MUSIC_TIME)
ZSS_MUSIC_MAP.set('3', ZSS_MUSIC_TIMEMOD)
ZSS_MUSIC_MAP.set('.', ZSS_MUSIC_TIMEMOD)
ZSS_MUSIC_MAP.set('+', ZSS_MUSIC_OCTAVE)
ZSS_MUSIC_MAP.set('-', ZSS_MUSIC_OCTAVE)
ZSS_MUSIC_MAP.set('0', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('1', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('2', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('p', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('4', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('5', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('6', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('7', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('8', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set('9', ZSS_MUSIC_DRUM)
ZSS_MUSIC_MAP.set(';', ZSS_TYPE_SYMBOL)

// ---------------------------------------------------------------------------
// Editor row token coloring (shared by editorrows)
// ---------------------------------------------------------------------------

export type EditorRowTokenColorsParams = {
  row: { start: number; end: number; tokens?: IToken[] }
  index: number
  edge: { right: number }
  context: WRITE_TEXT_CONTEXT
  xoffset: number
  active: boolean
  cursor: number
}

export function parsestatformat(image: string): string[] {
  const [first] = image.substring(1).split(';')
  return first.split(' ')
}

/**
 * Applies syntax highlighting for a single editor row's tokens.
 * Returns the index of the token under the cursor, or -1.
 */
export function applyEditorRowTokenColors({
  row,
  index,
  edge,
  context,
  xoffset,
  active,
  cursor,
}: EditorRowTokenColorsParams): number {
  let activetokenidx = -1
  const cursorcolumn = clamp(cursor - row.start, 1, row.end - row.start)
  if (!ispresent(row.tokens)) {
    return activetokenidx
  }
  for (let t = 0; t < row.tokens.length; ++t) {
    const token = row.tokens[t]
    if (
      active &&
      cursorcolumn >= (token.startColumn ?? 1) &&
      cursorcolumn <= (token.endColumn ?? 1)
    ) {
      activetokenidx = t
    }
    const left = (token.startColumn ?? 1) - 1 - xoffset
    const right = (token.endColumn ?? 1) - 1 - xoffset
    const maybecolor = ZSS_COLOR_MAP[token.tokenTypeIdx]
    if (!ispresent(maybecolor)) {
      continue
    }
    // #ticker <content>: "ticker" = dkgreen, content = green
    if (token.tokenTypeIdx === lexer.command_ticker.tokenTypeIdx) {
      const nameLen = 6 // "ticker"
      clippedapplycolortoindexes(
        index,
        edge.right,
        left,
        left + nameLen - 1,
        ZSS_TYPE_COMMAND,
        context.active.bg,
        context,
      )
      if (left + nameLen <= right) {
        clippedapplycolortoindexes(
          index,
          edge.right,
          left + nameLen,
          right,
          ZSS_TYPE_TEXT,
          context.active.bg,
          context,
        )
      }
      continue
    }
    // #toast <content>: "toast" = dkgreen, content = green
    if (token.tokenTypeIdx === lexer.command_toast.tokenTypeIdx) {
      const nameLen = 5 // "toast"
      clippedapplycolortoindexes(
        index,
        edge.right,
        left,
        left + nameLen - 1,
        ZSS_TYPE_COMMAND,
        context.active.bg,
        context,
      )
      if (left + nameLen <= right) {
        clippedapplycolortoindexes(
          index,
          edge.right,
          left + nameLen,
          right,
          ZSS_TYPE_TEXT,
          context.active.bg,
          context,
        )
      }
      continue
    }
    switch (maybecolor) {
      case ZSS_TYPE_STATNAME: {
        const words = parsestatformat(token.image ?? '')
        const statinfo = statformat('', words, !!token.payload)
        switch (statinfo.type) {
          case STAT_TYPE.BOARD:
          case STAT_TYPE.LOADER:
          case STAT_TYPE.OBJECT:
          case STAT_TYPE.TERRAIN:
          case STAT_TYPE.CHARSET:
          case STAT_TYPE.PALETTE:
            clippedapplycolortoindexes(
              index,
              edge.right,
              left,
              right,
              ZSS_TYPE_STATNAME,
              context.active.bg,
              context,
            )
            break
          case STAT_TYPE.CONST:
          case STAT_TYPE.RANGE:
          case STAT_TYPE.SELECT:
          case STAT_TYPE.NUMBER:
          case STAT_TYPE.TEXT:
          case STAT_TYPE.HOTKEY:
          case STAT_TYPE.COPYIT:
          case STAT_TYPE.OPENIT:
          case STAT_TYPE.ZSSEDIT:
          case STAT_TYPE.CHAREDIT:
          case STAT_TYPE.COLOREDIT: {
            const [first] = words
            clippedapplycolortoindexes(
              index,
              edge.right,
              left,
              left + first.length,
              ZSS_TYPE_STATNAME,
              context.active.bg,
              context,
            )
            if (words.length > 1) {
              clippedapplycolortoindexes(
                index,
                edge.right,
                left + first.length + 1,
                right,
                ZSS_TYPE_NUMBER,
                context.active.bg,
                context,
              )
            }
            break
          }
          default:
            clippedapplycolortoindexes(
              index,
              edge.right,
              left,
              right,
              ZSS_TYPE_ERROR_LINE,
              context.active.bg,
              context,
            )
            break
        }
        break
      }
      case ZSS_TYPE_SYMBOL:
        clippedapplycolortoindexes(
          index,
          edge.right,
          left,
          right,
          maybecolor,
          context.active.bg,
          context,
        )
        break
      case ZSS_TYPE_TEXT: {
        const wordcolor = zsswordcolor(token.image ?? '')
        if (isarray(wordcolor)) {
          for (let c = 0; c < wordcolor.length; ++c) {
            clippedapplycolortoindexes(
              index,
              edge.right,
              left + c,
              right + c,
              wordcolor[c],
              context.active.bg,
              context,
            )
          }
        } else {
          clippedapplycolortoindexes(
            index,
            edge.right,
            left,
            right,
            wordcolor,
            context.active.bg,
            context,
          )
        }
        break
      }
      default:
        clippedapplycolortoindexes(
          index,
          edge.right,
          left,
          right,
          maybecolor,
          context.active.bg,
          context,
        )
        break
    }
  }
  return activetokenidx
}
