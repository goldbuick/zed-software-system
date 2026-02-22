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

export const ZSS_WORD_MESSAGE = COLOR.DKPURPLE
export const ZSS_WORD_FLAG = COLOR.PURPLE
export const ZSS_WORD_STAT = COLOR.DKPURPLE
export const ZSS_WORD_KIND = COLOR.CYAN
export const ZSS_WORD_KIND_ALT = COLOR.DKCYAN
export const ZSS_WORD_COLOR = COLOR.RED
export const ZSS_WORD_DIR = COLOR.WHITE
export const ZSS_WORD_DIRMOD = COLOR.LTGRAY
export const ZSS_WORD_EXPRS = COLOR.YELLOW

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
  [lexer.category_isterrain.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.category_isobject.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  // collision queries
  [lexer.collision_issolid.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_iswalk.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_isswim.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_isbullet.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_isghost.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_iswalking.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_iswalkable.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_isswimming.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.collision_isswimmable.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  // fg colors
  [lexer.color_black.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkblue.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkgreen.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkcyan.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkred.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkpurple.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkyellow.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ltgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blue.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_green.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_cyan.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_red.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_purple.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_yellow.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_white.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_brown.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkwhite.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ltgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_gray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_grey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_dkgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ltblack.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  // bg colors
  [lexer.color_onblack.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkblue.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkgreen.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkcyan.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkred.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkpurple.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkyellow.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onltgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onblue.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ongreen.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_oncyan.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onred.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onpurple.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onyellow.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onwhite.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onbrown.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkwhite.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onltgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ongray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ongrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_ondkgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onltblack.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_onclear.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  // blink colors
  [lexer.color_blblack.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkblue.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkgreen.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkcyan.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkred.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkpurple.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkyellow.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blltgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blblue.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blgreen.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blcyan.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blred.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blpurple.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blyellow.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blwhite.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blbrown.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkwhite.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blltgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blgray.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_bldkgrey.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  [lexer.color_blltblack.tokenTypeIdx ?? 0]: ZSS_WORD_COLOR,
  // directions
  [lexer.dir_idle.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_up.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_down.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_left.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_right.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_flow.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_seek.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_rnd.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_rndns.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_rndne.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_north.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_south.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_west.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_east.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_over.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_under.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_ground.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_within.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_elements.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_select.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_i.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_u.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_n.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_d.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_s.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_l.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_w.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_r.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  [lexer.dir_e.tokenTypeIdx ?? 0]: ZSS_WORD_DIR,
  // direction modifiers
  [lexer.dir_by.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_at.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_cw.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_ccw.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_opp.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_rndp.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_away.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_toward.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_find.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_flee.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_to.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  [lexer.dir_awayby.tokenTypeIdx ?? 0]: ZSS_WORD_DIRMOD,
  // expressions
  [lexer.expr_aligned.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_contact.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_blocked.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_any.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_count.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_abs.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_intceil.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_intfloor.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_intround.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_clamp.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_min.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_max.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_pick.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_pickwith.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_random.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_randomwith.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_run.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_runwith.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
  [lexer.expr_stop.tokenTypeIdx ?? 0]: ZSS_WORD_EXPRS,
}

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

export function zssmusiccolorconfig(music: string, color: COLOR) {
  ZSS_MUSIC_MAP.set(music, color)
}

export function zssmusiccolor(music: string) {
  return ZSS_MUSIC_MAP.get(music) ?? COLOR.GREEN
}
