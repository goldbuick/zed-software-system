import { randominteger } from 'zss/mapping/number'
import { NAME } from 'zss/words/types'

export async function fetchwiki(pagepath: string) {
  const nocache = randominteger(1111111, 9999999)
  const wikiname = NAME(pagepath.replace(/[^a-zA-Z/]/g, ''))
  const result = await fetch(
    `https://raw.githubusercontent.com/wiki/goldbuick/zed-software-system/${wikiname}.md?q=${nocache}`,
  )
  return await result.text()
}
