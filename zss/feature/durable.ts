import {
  del,
  entries,
  get,
  getMany,
  set,
  setMany,
  update,
} from 'idb-keyval'

export async function durableget<T>(key: string): Promise<T | undefined> {
  return get<T>(key)
}

export async function durableset<T>(key: string, value: T): Promise<void> {
  return set(key, value)
}

export async function durableupdate<T>(
  key: string,
  updater: (oldvalue: T | undefined) => T,
): Promise<void> {
  return update(key, updater)
}

export async function durabledel(key: string): Promise<void> {
  return del(key)
}

export async function durablegetmany<T>(
  keys: readonly string[],
): Promise<(T | undefined)[]> {
  return getMany<T>(keys as string[])
}

export async function durableentries(): Promise<[string, unknown][]> {
  const rows = await entries()
  return rows.map(([key, value]) => [String(key), value])
}

export async function durablesetmany(
  entrieslist: [string, unknown][],
): Promise<void> {
  if (entrieslist.length === 0) {
    return
  }
  return setMany(entrieslist)
}
