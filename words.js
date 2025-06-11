import { unigram } from 'unigram'
import fs from 'fs'

// real max 23135851162
const LETTER_RANK = '23135853000'

const subset = unigram
  .filter((item) => item.word.length < 11 && item.freq > 120000)
  .map((item) => {
    if (item.word.length === 1) {
      item.freq = LETTER_RANK
    }
    return item
  })
console.info(`writing ${subset.length} words`)

fs.writeFileSync('./zss/feature/t9words.json', JSON.stringify(subset, null, 2))
