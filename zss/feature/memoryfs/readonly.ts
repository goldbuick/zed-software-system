import { ispid } from 'zss/mapping/guid'

const BOARD_OBJECT_PATH =
  /^books\/[^/]+\/pages\/[^/]+\/board\/objects\/([^/]+)\.json$/

/** True when path is a player board object JSON (MEMORY -> disk only). */
export function memoryfsisreadonlypath(path: string): boolean {
  const match = BOARD_OBJECT_PATH.exec(path)
  if (!match) {
    return false
  }
  return ispid(match[1])
}

export function memoryfsreadobjectidfrompath(path: string): string | undefined {
  const match = BOARD_OBJECT_PATH.exec(path)
  return match?.[1]
}
