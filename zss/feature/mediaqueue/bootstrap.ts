import { mediaqueueensurevideosink } from 'zss/feature/mediaqueue/attachvideo'
import {
  restoremainvolfromstorage,
  restoremediavolfromstorage,
} from 'zss/feature/mediaqueue/boardtvaudio'
import { netterminalregisterpeeropenhandler } from 'zss/feature/netterminal'

let bootstrapped = false

export function mediaqueuebootstrap() {
  if (bootstrapped) {
    return
  }
  bootstrapped = true
  void restoremainvolfromstorage()
  void restoremediavolfromstorage()
  mediaqueueensurevideosink()
}

netterminalregisterpeeropenhandler(() => {
  mediaqueuebootstrap()
})
