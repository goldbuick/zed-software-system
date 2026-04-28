import { createdevice } from 'zss/device'
import {
  leafapplyinbound,
  leafprepareoutbound,
} from 'zss/feature/jsondiffsync/leaf'
import { createleafsession } from 'zss/feature/jsondiffsync/session'
import { JSONDIFF_INITIAL_DOCUMENT } from 'zss/feature/jsondiffsync/sync'
import { LEAF_SESSION, issyncmessage } from 'zss/feature/jsondiffsync/types'
import { MAYBE, ispresent } from 'zss/mapping/types'
import {
  memoryreadbooklist,
  memoryreadhalt,
  memoryreadoperator,
  memoryreadsession,
  memoryreadsimfreeze,
  memoryreadtopic,
} from 'zss/memory/session'

import { vmjsondiffsync } from './api'

function logboardrunnermemory(reason: string): void {
  try {
    const books = memoryreadbooklist()
    const booklabels: { id: string; name: string }[] = []
    for (let i = 0; i < Math.min(books.length, 24); ++i) {
      const b = books[i]
      booklabels.push({ id: b.id, name: b.name })
    }
    console.info('[boardrunner]', reason, {
      session: memoryreadsession(),
      operator: memoryreadoperator(),
      topic: memoryreadtopic(),
      halt: memoryreadhalt(),
      simfreeze: memoryreadsimfreeze(),
      bookcount: books.length,
      booksample: booklabels,
    })
  } catch (err) {
    console.info('[boardrunner] MEMORY snapshot failed', reason, err)
  }
}

let leafsession: MAYBE<LEAF_SESSION>

export function createboardrunnerleafsession(player: string) {
  console.info('[boardrunner] creating leaf session for player', player)
  leafsession = createleafsession(player, JSONDIFF_INITIAL_DOCUMENT)
}

const boardrunner = createdevice('boardrunner', [], (message) => {
  console.info('boardrunner', message.target, message.data)
  if (!boardrunner.session(message)) {
    return
  }

  switch (message.target) {
    case 'jsondiffsync':
      if (leafsession?.peer === message.player && issyncmessage(message.data)) {
        const inbound = leafapplyinbound(leafsession, message.data)
        if (!inbound.ok) {
          console.info('[boardrunner] leafapplyinbound failed', inbound)
          return
        }
        const prep = leafprepareoutbound(leafsession)
        if (prep.message !== undefined) {
          vmjsondiffsync(boardrunner, message.player, prep.message)
        }
        logboardrunnermemory('jsondiffsync inbound')
      }
      break
    default:
      break
  }
})
