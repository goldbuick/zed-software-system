import { statformat } from 'zss/words/stats'
import { STAT_TYPE } from 'zss/words/types'

export function makeitscroll(player: string, makeit: string) {
  const [maybestat, maybelabel] = makeit.split(';')
  const words = maybestat.split(' ')
  const statname = statformat(maybelabel, words, true)
  const statvalue = statformat(maybelabel, words, false)
  switch (statvalue.type) {
    case STAT_TYPE.CONST:
      console.info(1, statname, '|', statvalue)
      break
    case STAT_TYPE.RANGE:
    case STAT_TYPE.SELECT:
    case STAT_TYPE.NUMBER:
    case STAT_TYPE.TEXT:
    case STAT_TYPE.HOTKEY:
    case STAT_TYPE.COPYIT:
    case STAT_TYPE.OPENIT:
    case STAT_TYPE.VIEWIT:
    case STAT_TYPE.ZSSEDIT:
    case STAT_TYPE.CHAREDIT:
    case STAT_TYPE.COLOREDIT:
      // ask to edit player codepage
      console.info(2, statvalue)
      break
  }
}
