type BOARD_SYNC_LISTENER = () => void

const boardsynclisteners: BOARD_SYNC_LISTENER[] = []

export function memoryregisterboardsyncnotify(listener: BOARD_SYNC_LISTENER): void {
  boardsynclisteners.push(listener)
}

export function memorynotifyboardsync(): void {
  for (let i = 0; i < boardsynclisteners.length; ++i) {
    boardsynclisteners[i]()
  }
}
