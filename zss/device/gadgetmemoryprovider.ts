import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

// Sim worker (and any process without boardrunner) needs gadgetstate backed by
// mainbook.flags[GADGETSTORE] so vm handlers (e.g. refscroll) read/write the
// same store shape as boardrunners. Matches former gadgetserver.ts provider.
gadgetstateprovider((element) => {
  if (ispid(element)) {
    const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
    const gadgetstore = memoryreadbookflags(
      mainbook,
      MEMORY_LABEL.GADGETSTORE,
    ) as any
    let value = gadgetstore[element]
    if (!ispresent(value)) {
      gadgetstore[element] = value = initstate()
    }
    return value
  }
  return initstate()
})
