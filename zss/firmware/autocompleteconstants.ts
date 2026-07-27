/** Shared autocomplete keyword lists for firmware command argmeta. */

export const USERINPUT_ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'shootup',
  'shootdown',
  'shootleft',
  'shootright',
  'ok',
  'cancel',
] as const

export const PERMISSION_CONFIG_KEYWORDS = ['lockdown', 'creative'] as const

export const PERMISSION_ROLE_KEYWORDS = ['admin', 'mod', 'player'] as const

export const CHAT_HEAD_KEYWORDS = ['start', 'stop', 'profile'] as const

export const CHAT_FEED_KINDS = ['twitch', 'rss', 'mastodon', 'bluesky'] as const

export const CHAT_PROFILE_KEYWORDS = ['list', 'show', 'delete', 'save'] as const

export const ZNS_SUBCOMMANDS = [
  'login',
  'restart',
  'book',
  'bytes',
  'code',
  'import',
  'del',
  'delete',
] as const

export const ZNS_IMPORT_MODES = ['code'] as const

export const ZNS_CODEPAGE_LISTS = [
  'objects',
  'boards',
  'loaders',
  'terrains',
  'palettes',
  'charsets',
] as const

export const CODEPAGE_NAME_LISTS = [...ZNS_CODEPAGE_LISTS]

export const BRIDGE_SUBCOMMANDS = ['status'] as const

export const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const

export const FETCH_METHOD_KEYWORDS = [...HTTP_METHODS]

/** Shared first-arg keywords for #echo / #reverb / … (applywasmfxconfig). */
export const FX_FIRST_ARG_KEYWORDS = [
  'on',
  'off',
  'delaytime',
  'feedback',
  'decay',
  'predelay',
  'rate',
  'distortion',
  'frequency',
  'depth',
  'basefrequency',
  'octaves',
  'q',
  'type',
  'maxdelay',
  'sensitivity',
  'gain',
  'follower',
] as const

export const TTS_ENGINE_KEYWORDS = ['piper', 'supertonic', 'fish'] as const

export const TTS_FISH_MODEL_KEYWORDS = [
  's2.1-pro-free',
  's2.1-pro',
  's2-pro',
  's1',
] as const

export const BROADCAST_HEAD_KEYWORDS = ['stop', 'whip'] as const

export const BROADCAST_WHIP_ALIASES = ['twitch', 'ivs'] as const

export const PIVOT_SHEAR_KEYWORDS = [
  'taper_floor',
  'taper_ceil',
  'taper_trunc',
  'mishin_floor',
  'mishin_ceil',
  'shear_soft',
  'shear_hard',
] as const
