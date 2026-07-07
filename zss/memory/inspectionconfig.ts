import { durableget, durableupdate } from 'zss/feature/durable'

/** Tiny helper used by inspection menus that persist a config blob in durable KV. */
export type INSPECTION_CONFIG_STORE<T> = {
  load(): Promise<void>
  save(): Promise<void>
  read(): T
  write(next: T): void
}

export function createinspectionconfig<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
): INSPECTION_CONFIG_STORE<T> {
  let current: T = { ...defaults }
  return {
    async load() {
      const stored = await durableget<T>(key)
      if (stored) {
        current = { ...current, ...stored }
      }
    },
    async save() {
      await durableupdate(key, () => current)
    },
    read() {
      return current
    },
    write(next: T) {
      current = next
    },
  }
}
