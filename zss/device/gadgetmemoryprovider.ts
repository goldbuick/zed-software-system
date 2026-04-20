import { gadgetstateprovider, initstate } from 'zss/gadget/data/api'
import { ispid } from 'zss/mapping/guid'
import { ispresent } from 'zss/mapping/types'
import { memoryreadbookflags } from 'zss/memory/bookoperations'
import { memorymarkmemorydirty } from 'zss/memory/memorydirty'
import { memoryreadbookbysoftware } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

// we store the gadget state in the main book flag
// mainbook.flags[GADGETSTORE]
gadgetstateprovider(
  (player) => {
    if (ispid(player)) {
      const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
      const gadgetstore = memoryreadbookflags(
        mainbook,
        MEMORY_LABEL.GADGETSTORE,
      ) as any
      let value = gadgetstore[player]
      if (!ispresent(value)) {
        gadgetstore[player] = value = initstate()
        memorymarkmemorydirty()
      }
      return value
    }

    return initstate()
  },
  () => memorymarkmemorydirty(),
)
