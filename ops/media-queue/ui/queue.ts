import {
  type MQ_QUEUE,
  type MQ_QUEUE_ADD_RESULT,
  type MQ_QUEUE_DISK,
  type MQ_QUEUE_ENTRY,
  type MQ_QUEUE_META,
  type MQ_QUEUE_SNAPSHOT,
  mqqueueadd,
  mqqueueallowlongforurl,
  mqqueueapplydisk,
  mqqueueapprove,
  mqqueueclear,
  mqqueuecountplayer,
  mqqueuecreate,
  mqqueuecurrenturl,
  mqqueuepend,
  mqqueuereaddisk,
  mqqueuereadsnapshot,
  mqqueuereject,
  mqqueuesetlimit,
  mqqueueshift,
  mqqueueskip,
  mqqueueurls,
} from '../src/shared/queue'

const helperqueue: MQ_QUEUE = mqqueuecreate()

export function helperqueueapplydisk(disk: MQ_QUEUE_DISK): void {
  mqqueueapplydisk(helperqueue, disk)
}

export function helperqueuereaddisk(): MQ_QUEUE_DISK {
  return mqqueuereaddisk(helperqueue)
}

export function helperqueuereadsnapshot(): MQ_QUEUE_SNAPSHOT {
  return mqqueuereadsnapshot(helperqueue)
}

export function helperqueuecurrenturl(): string | undefined {
  return mqqueuecurrenturl(helperqueue)
}

export function helperqueueurls(): string[] {
  return mqqueueurls(helperqueue)
}

export function helperqueueallowlong(url: string): boolean {
  return mqqueueallowlongforurl(helperqueue, url)
}

export function helperqueuenexturl(): string {
  const snap = mqqueuereadsnapshot(helperqueue)
  return String(snap.urls[snap.index + 1] || '').trim()
}

export function helperqueueadd(
  player: string,
  name: string,
  url: string,
  meta?: MQ_QUEUE_META,
): MQ_QUEUE_ADD_RESULT {
  return mqqueueadd(helperqueue, player, name, url, meta)
}

export function helperqueuepend(
  player: string,
  name: string,
  url: string,
  meta?: MQ_QUEUE_META,
): MQ_QUEUE_ADD_RESULT {
  return mqqueuepend(helperqueue, player, name, url, meta)
}

export function helperqueueapprove(index: number): MQ_QUEUE_ENTRY | undefined {
  return mqqueueapprove(helperqueue, index)
}

export function helperqueuereject(index: number): MQ_QUEUE_ENTRY | undefined {
  return mqqueuereject(helperqueue, index)
}

export function helperqueueshift() {
  return mqqueueshift(helperqueue)
}

export function helperqueueskip(): string | undefined {
  return mqqueueskip(helperqueue)
}

export function helperqueueclear(): void {
  mqqueueclear(helperqueue)
}

export function helperqueuesetlimit(limit: number): number {
  return mqqueuesetlimit(helperqueue, limit)
}

export function helperqueuecountplayer(player: string): number {
  return mqqueuecountplayer(helperqueue, player)
}

export function helperqueuelimit(): number {
  return helperqueue.limit
}
