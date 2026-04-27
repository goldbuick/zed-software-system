import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { creategadgetmemid } from 'zss/memory/flagmemids'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

// main book row `flags[${player}_gadget]` holds full GADGET_STATE
gadgetstateprovider((player) => {
  if (ispid(player)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const row = memoryreadbookflags(mainbook, creategadgetmemid(player)) as any
    if (!ispresent(row.id)) {
      Object.assign(row, initstate())
    }
    return row
  }

  return initstate()
})
