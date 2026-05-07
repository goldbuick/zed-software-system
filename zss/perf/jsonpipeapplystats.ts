let total = 0

export function recordjsonpipeapplyremoteops(count: number) {
  if (count > 0) {
    total += count
  }
}

export function readjsonpipeapplyremotestats() {
  return { total }
}
