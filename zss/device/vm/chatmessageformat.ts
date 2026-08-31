import { sanitizechatrostername } from 'zss/device/vm/chatrosterformat'
import { isnumber, isstring } from 'zss/mapping/types'

/** Strip characters that would break `name|voice:text` header parsing. */
function sanitizechatvoicehint(raw: string): string {
  return raw.replace(/[:|\r\n]+/g, '')
}

function formatchatuser(user: unknown): string {
  if (!isstring(user)) {
    return 'player'
  }
  return sanitizechatrostername(user)
}

function formatchatvoice(voice: unknown): string {
  if (isnumber(voice)) {
    return sanitizechatvoicehint(String(voice))
  }
  if (!isstring(voice)) {
    return ''
  }
  const trimmed = voice.trim()
  if (!trimmed) {
    return ''
  }
  return sanitizechatvoicehint(trimmed)
}

/**
 * Loader body for `chat:message*` / `chat:action*`: `name|voice:text`.
 * Voice may be empty (`alice|:hello`); always includes the pipe.
 */
export function formatchatmessagebody(
  user: unknown,
  voice: unknown,
  text: string,
): string {
  return `${formatchatuser(user)}|${formatchatvoice(voice)}:${text}`
}
