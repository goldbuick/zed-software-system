import { create } from 'zustand'
import { qrlines } from 'zss/mapping/qr'

export type AIRSHARE_MODE = 'off' | 'invite' | 'stream' | 'receive'

export type AIRSHARE_STATE = {
  mode: AIRSHARE_MODE
  /** Invite URL for the static QR. */
  inviteurl: string
  /** Compressed MEMORY zip bytes while streaming. */
  payload: Uint8Array | null
  /** Frames collected (receive) or seq shown (send). */
  progress: number
  /** Expected blocks K (for progress display). */
  blockcount: number
  status: string
  error: string
}

const INITIAL: AIRSHARE_STATE = {
  mode: 'off',
  inviteurl: '',
  payload: null,
  progress: 0,
  blockcount: 0,
  status: '',
  error: '',
}

export const useAirshare = create<AIRSHARE_STATE>(() => ({ ...INITIAL }))

export function airsharereset() {
  useAirshare.setState({ ...INITIAL, payload: null })
}

export function airshareinviteqrlines(url: string): string[] {
  return qrlines(url)
}
