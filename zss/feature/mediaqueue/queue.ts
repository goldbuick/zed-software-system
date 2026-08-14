/** Host-owned media URL queue (cafe side). */

export type MEDIAQUEUE_STATE = {
  urls: string[]
  index: number
}

let queueurls: string[] = []
let queueindex = 0

export function mediaqueuereadstate(): MEDIAQUEUE_STATE {
  return {
    urls: [...queueurls],
    index: queueindex,
  }
}

export function mediaqueueclear() {
  queueurls = []
  queueindex = 0
}

export function mediaqueueadd(url: string) {
  const trimmed = url.trim()
  if (!trimmed) {
    return mediaqueuereadstate()
  }
  queueurls = [...queueurls, trimmed]
  return mediaqueuereadstate()
}

export function mediaqueuesetindex(index: number) {
  if (queueurls.length === 0) {
    queueindex = 0
    return mediaqueuereadstate()
  }
  const next = Math.max(0, Math.min(index, queueurls.length - 1))
  queueindex = next
  return mediaqueuereadstate()
}

export function mediaqueuenext() {
  if (queueurls.length === 0) {
    return mediaqueuereadstate()
  }
  queueindex = (queueindex + 1) % queueurls.length
  return mediaqueuereadstate()
}

export function mediaqueuecurrenturl(): string | undefined {
  if (queueurls.length === 0) {
    return undefined
  }
  return queueurls[queueindex]
}
