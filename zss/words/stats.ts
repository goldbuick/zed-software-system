import { STAT, STAT_TYPE } from './types'

export function statformat(stat: string): STAT[] {
  const stats: STAT[] = []
  // split by ; first
  const statstrings = stat.split(';')
  for (let i = 0; i < statstrings.length; ++i) {
    // split by spaces
    const [maybetype, ...values] = statstrings[i].trim().split(' ')
    switch (maybetype.toLowerCase()) {
      default:
        stats.push({
          type: STAT_TYPE.VALUE,
          values: [statstrings[i]],
        })
        break
      case 'rn':
      case 'range':
        stats.push({ type: STAT_TYPE.RANGE, values })
        break
      case 'sl':
      case 'select':
        stats.push({ type: STAT_TYPE.SELECT, values })
        break
      case 'nm':
      case 'number':
        stats.push({ type: STAT_TYPE.NUMBER, values })
        break
      case 'tx':
      case 'text':
        stats.push({ type: STAT_TYPE.TEXT, values })
        break
      case 'link':
        stats.push({ type: STAT_TYPE.LINK, values })
        break
      case 'hk':
      case 'hotkey':
        stats.push({ type: STAT_TYPE.HOTKEY, values })
        break
      case 'code':
        stats.push({ type: STAT_TYPE.CODE, values })
        break
    }
  }
  return stats
}
