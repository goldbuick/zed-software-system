import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

/** Same backing store as gadgetserver: `book.flags.gadgetstore[player]`. */
export function registermemorygadgetstateprovider() {
  gadgetstateprovider((element) => {
    if (ispid(element)) {
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      const gadgetstore = memoryreadbookflags(
        mainbook,
        MEMORY_LABEL.GADGETSTORE,
      ) as unknown as Record<string, ReturnType<typeof initstate>>
      let value = gadgetstore[element]
      if (!ispresent(value)) {
        gadgetstore[element] = value = initstate()
      }
      return value
    }
    return initstate()
  })
}
