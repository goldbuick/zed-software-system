import {
  type MQ_QUEUE,
  type MQ_QUEUE_ADD_RESULT,
  type MQ_QUEUE_DISK,
  type MQ_QUEUE_SNAPSHOT,
  mqqueueadd,
  mqqueueapplydisk,
  mqqueueclear,
  mqqueuecreate,
  mqqueuecurrenturl,
  mqqueuereaddisk,
  mqqueuereadsnapshot,
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

export function helperqueueadd(
  player: string,
  name: string,
  url: string,
): MQ_QUEUE_ADD_RESULT {
  return mqqueueadd(helperqueue, player, name, url)
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
