import { createdevice } from 'zss/device'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withmainthreadgpulock } from 'zss/feature/gpu/gpulock'
import { prepareforsttload } from 'zss/feature/gpu/gpumain'
import { STT_MODEL_ID } from 'zss/feature/stt/sttpreset'
import { createsid } from 'zss/mapping/guid'
import { isstring } from 'zss/mapping/types'

function formatprogress(phase: string, detail?: string): string {
  switch (phase) {
    case 'load':
      return 'speech model loading ...'
    case 'download':
      return detail ? `speech dl ${detail}` : 'speech model downloading ...'
    case 'progress':
      return detail ? `speech dl ${detail}` : 'speech model downloading ...'
    case 'done':
      return detail
        ? `speech dl done ${detail}`
        : 'speech model downloading ...'
    default:
      return 'speech model loading ...'
  }
}

export function sttensure(
  onprogress: (message: string) => void,
): Promise<void> {
  const lockid = createsid()
  return withmainthreadgpulock('stt', lockid, async () => {
    await prepareforsttload()
    return new Promise((resolve, reject) => {
      const once = createdevice(
        createsid(),
        [],
        (message) => {
          switch (message.target) {
            case 'stt:progress': {
              const data = message.data as { phase?: string; detail?: string }
              if (isstring(data?.phase)) {
                onprogress(formatprogress(data.phase, data.detail))
              }
              break
            }
            case 'stt:ready':
              onprogress('speech model ready')
              once.disconnect()
              resolve()
              break
            case 'stt:error': {
              const data = message.data as { message?: string }
              once.disconnect()
              reject(new Error(data?.message ?? 'stt ensure failed'))
              break
            }
          }
        },
        SOFTWARE.session(),
      )
      once.emit(registerreadplayer(), 'stt:ensure', [STT_MODEL_ID])
    })
  })
}

export function stttranscribe(
  samples: Float32Array,
  samplerate: number,
  onprogress?: (message: string) => void,
): Promise<string> {
  const lockid = createsid()
  return withmainthreadgpulock('stt', lockid, () => {
    return new Promise((resolve, reject) => {
      const once = createdevice(
        createsid(),
        [],
        (message) => {
          switch (message.target) {
            case 'stt:progress': {
              if (onprogress) {
                const data = message.data as { phase?: string; detail?: string }
                if (isstring(data?.phase)) {
                  onprogress(formatprogress(data.phase, data.detail))
                }
              }
              break
            }
            case 'stt:result': {
              const data = message.data as { text?: string }
              once.disconnect()
              resolve(isstring(data?.text) ? data.text : '')
              break
            }
            case 'stt:error': {
              const data = message.data as { message?: string }
              once.disconnect()
              reject(new Error(data?.message ?? 'stt transcribe failed'))
              break
            }
          }
        },
        SOFTWARE.session(),
      )
      once.emit(registerreadplayer(), 'stt:transcribe', [samples, samplerate])
    })
  })
}

export function sttdispose(): Promise<void> {
  return new Promise((resolve) => {
    const once = createdevice(
      createsid(),
      [],
      (message) => {
        if (message.target === 'stt:disposed') {
          once.disconnect()
          resolve()
        }
      },
      SOFTWARE.session(),
    )
    once.emit(registerreadplayer(), 'stt:dispose', [])
    setTimeout(() => {
      once.disconnect()
      resolve()
    }, 30_000)
  })
}
