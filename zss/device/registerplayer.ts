/** Current login player id — no register device / UI imports. */

let myplayerid = ''

export function registerwriteplayer(player: string) {
  myplayerid = player
}

export function registerreadplayer() {
  return myplayerid
}
