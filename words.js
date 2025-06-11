import { unigram } from 'unigram'
import fs from 'fs'

const subset = unigram.slice(0, 9999)

fs.writeFileSync('./zss/feature/t9words.json', JSON.stringify(subset, null, 2))