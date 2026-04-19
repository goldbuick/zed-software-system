// these are all front-end devices
import './device/gadgetclient'
import { startgadgetslimsubscription } from './device/gadgetrxsubscribe'
import './device/jsonsyncclient'
import './device/rxreplclient'
import './device/modem'
import './device/bridge'
import './device/register'
import './device/synth'

startgadgetslimsubscription()
