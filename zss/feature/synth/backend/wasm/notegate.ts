/**
 * Mono voice gate ownership: a scheduled note-off only applies while this
 * noteid is still the active note on the channel (a later note-on supersedes).
 */
export function gateoffstillactive(
  activegatebychan: Map<number, number>,
  chan: number,
  noteid: number,
): boolean {
  return activegatebychan.get(chan) === noteid
}
