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

export const CHAT_FEED_KINDS = [
  'twitch',
  'rss',
  'mastodon',
  'bluesky',
] as const

export const CHAT_PROFILE_KEYWORDS = [
  'list',
  'show',
  'delete',
  'save',
] as const

export const WANIX_ACTIONS = [
  'vm',
  'stop',
  'remote',
  'zedsync',
  'menu',
  'term',
  'attach',
  'detach',
  'bridge',
] as const

export const WANIX_VM_SUB = ['stop'] as const

export const WANIX_REMOTE_SUB = [
  'connect',
  'disconnect',
  'list',
] as const

export const WANIX_ZEDSYNC_SUB = ['start', 'halt', 'clear'] as const

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
  'objects', 'boards', 'loaders', 'terrains', 'palettes', 'charsets',
] as const

export const CODEPAGE_NAME_LISTS = [...ZNS_CODEPAGE_LISTS]

export const BRIDGE_SUBCOMMANDS = ['status'] as const

export const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const

export const FETCH_METHOD_KEYWORDS = [...HTTP_METHODS]
