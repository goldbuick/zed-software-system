import { formatprintvalue } from 'zss/words/printvalue'
import { CATEGORY, COLLISION, COLOR } from 'zss/words/types'

describe('formatprintvalue', () => {
  it('formats color stat numbers as lowercase names', () => {
    expect(formatprintvalue(COLOR.BLUE, 'color')).toBe('blue')
    expect(formatprintvalue(9, 'color')).toBe('blue')
    expect(`key${formatprintvalue(9, 'color')}`).toBe('keyblue')
  })

  it('leaves plain numbers unchanged without a color name hint', () => {
    expect(formatprintvalue(9)).toBe(9)
    expect(formatprintvalue(12, 'char')).toBe(12)
    expect(formatprintvalue(4, 'cycle')).toBe(4)
  })

  it('formats STR_COLOR / STR_COLLISION / STR_CATEGORY arrays', () => {
    expect(formatprintvalue(['RED', 'ONBLACK'])).toBe('red onblack')
    expect(formatprintvalue(['ISSOLID'])).toBe('issolid')
    expect(formatprintvalue(['ISOBJECT'])).toBe('isobject')
  })

  it('formats STR_DIR and nested STR_GROUP', () => {
    expect(formatprintvalue(['NORTH'])).toBe('north')
    expect(formatprintvalue(['CW', 'EAST'])).toBe('cw east')
    expect(formatprintvalue(['TOWARD', ['monsters', ['BLUE']]])).toBe(
      'toward blue monsters',
    )
    expect(formatprintvalue(['BY', 2, 0])).toBe('by 2 0')
  })

  it('formats KIND / GROUP named colorable tuples', () => {
    expect(formatprintvalue(['pusher'])).toBe('pusher')
    expect(formatprintvalue(['key', ['YELLOW']])).toBe('yellow key')
    expect(formatprintvalue(['monsters', ['RED']])).toBe('red monsters')
  })

  it('formats collision and category numeric stats and const strings', () => {
    expect(formatprintvalue(COLLISION.ISSOLID, 'collision')).toBe('issolid')
    expect(formatprintvalue(COLLISION.ISWALK, 'collision')).toBe('iswalk')
    expect(formatprintvalue('ISWALK')).toBe('iswalk')
    expect(formatprintvalue(CATEGORY.ISOBJECT, 'category')).toBe('isobject')
    expect(formatprintvalue('ISTERRAIN')).toBe('isterrain')
  })

  it('keeps generic array/object labels for unknown shapes', () => {
    expect(formatprintvalue([1, 2, 3])).toBe('array 3 items')
    expect(formatprintvalue({ a: 1 })).toBe('obj a')
  })
})
