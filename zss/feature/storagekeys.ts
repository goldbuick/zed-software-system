/** Terminal toggle config keys (on/off), persisted as `config_*` in durable KV. */
export const CONFIG_KEYS = [
  'crt',
  'lowrez',
  'scanlines',
  'voice2text',
  'loaderlogging',
  'memoryfslogging',
  'dev',
  'gadget',
  'touchui',
] as const

/** Arbitrary string config keys under `config_*`. */
export const CONFIG_STRING_KEYS = [
  'ttsengine',
  'ttsengineconfig',
  'ttsenginemodel',
  'vol',
  'playvol',
  'bgvol',
  'ttsvol',
  'mediavol',
] as const

export function isconfigstringkey(name: string): boolean {
  return (CONFIG_STRING_KEYS as readonly string[]).includes(name)
}
