import { NAME } from 'zss/words/types'

export const BROWSER_CONTROL_ORIGIN = 'https://127.0.0.1:8890'

export const BROWSER_WHEP_ENDPOINT = `${BROWSER_CONTROL_ORIGIN}/whep`

const WHEP_ENDPOINT_ALIASES: Record<string, string> = {
  browser: BROWSER_WHEP_ENDPOINT,
}

export function listwhependpointaliases(): string[] {
  return ['browser']
}

export function resolvewhependpoint(
  endpointoralias: string,
): string | undefined {
  const raw = endpointoralias.trim()
  if (/^https?:\/\//i.test(raw)) {
    return raw
  }
  const key = NAME(raw)
  return WHEP_ENDPOINT_ALIASES[key]
}
