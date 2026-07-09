import { readsession, writesession } from 'zss/device/register/sessionstorage'
import {
  registerreadplayer,
  registerwriteplayer,
} from 'zss/device/registerplayer'
import { initdeeplinks } from 'zss/feature/deeplink'
import { createpid } from 'zss/mapping/guid'

registerwriteplayer(readsession('PLAYER') ?? createpid())
writesession('PLAYER', registerreadplayer())
initdeeplinks()
