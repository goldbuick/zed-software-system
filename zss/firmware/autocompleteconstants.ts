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
  'a',
  'b',
  'x',
  'y',
  'l1',
  'l2',
  'r1',
  'r2',
] as const

export const PERMISSION_CONFIG_KEYWORDS = [
  'lockdown',
  'creative',
  'open',
] as const

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

export const MEMORYFS_ACTION_KEYWORDS = ['status', 'detach'] as const

export const ZZTSEARCH_FIELD_KEYWORDS = [
  'title',
  'letter',
  'author',
  'genres',
  'filename',
  'screenshot',
  'publish_date',
] as const

export const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const

/** Methods accepted by network fetchcommand (not full HTTP_METHODS). */
export const FETCH_METHOD_KEYWORDS = ['get', 'post:json'] as const

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

/** Shared ADSR / level / portamento keys for every voice config command. */
export const SYNTH_COMMON_CONFIG_KEYWORDS = [
  'vol',
  'volume',
  'port',
  'portamento',
  'env',
  'envelope',
] as const

export const SYNTH_OSC_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'phase',
  'width',
  'modfreq',
  'modulationfrequency',
  'harmonicity',
  'modindex',
  'count',
  'spread',
  'modenv',
  'modulationenvelope',
  'modtype',
  'modulationtype',
] as const

export const SYNTH_BASIC_WAVE_KEYWORDS = [
  'sine',
  'square',
  'triangle',
  'sawtooth',
] as const

export const SYNTH_ALGO_OSC_WAVE_KEYWORDS = [
  ...SYNTH_BASIC_WAVE_KEYWORDS,
  'pulse',
  'pwm',
] as const

export const SYNTH_WAVE_COMMAND_NAMES = [
  'sine',
  'square',
  'triangle',
  'sawtooth',
  'custom',
  'amsine',
  'amsquare',
  'amtriangle',
  'amsawtooth',
  'fmsine',
  'fmsquare',
  'fmtriangle',
  'fmsawtooth',
  'fatsine',
  'fatsquare',
  'fattriangle',
  'fatsawtooth',
  'pulse',
  'pwm',
] as const

export const STRING_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'detune',
  'pwm',
  'vib',
  'filter',
] as const

export const PLUCK_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'structure',
  'brightness',
  'damping',
  'accent',
] as const

export const WIND_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'breath',
  'pressure',
  'brightness',
  'resonance',
] as const

export const PIANO_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'spread',
  'hammer',
  'brightness',
  'damping',
] as const

export const BOWED_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'bow',
  'pressure',
  'vib',
  'body',
] as const

export const GUITAR_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'pick',
  'body',
  'damping',
  'position',
] as const

export const ORGAN_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'drawbar',
  'click',
  'leak',
  'bright',
] as const

export const ALGO_CONFIG_KEYWORDS = [
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'harmonicity',
  'harmonicity1',
  'harmonicity2',
  'harmonicity3',
  'modindex',
  'modindex1',
  'modindex2',
  'modindex3',
  'osc1',
  'osc2',
  'osc3',
  'osc4',
  'env1',
  'envelope1',
  'env2',
  'envelope2',
  'env3',
  'envelope3',
  'env4',
  'envelope4',
] as const

export const NOISE_CONFIG_KEYWORDS = [...SYNTH_COMMON_CONFIG_KEYWORDS] as const

export const BELLS_CONFIG_KEYWORDS = [...SYNTH_COMMON_CONFIG_KEYWORDS] as const

/** Flat union of config keys for `#synth` first-arg autocomplete. */
export const SYNTH_CONFIG_KEYWORDS = [
  'restart',
  ...SYNTH_COMMON_CONFIG_KEYWORDS,
  'detune',
  'pwm',
  'vib',
  'filter',
  'structure',
  'brightness',
  'damping',
  'accent',
  'breath',
  'pressure',
  'resonance',
  'spread',
  'hammer',
  'bow',
  'body',
  'pick',
  'position',
  'drawbar',
  'click',
  'leak',
  'bright',
  'phase',
  'width',
  'modfreq',
  'modulationfrequency',
  'harmonicity',
  'harmonicity1',
  'harmonicity2',
  'harmonicity3',
  'modindex',
  'modindex1',
  'modindex2',
  'modindex3',
  'count',
  'modenv',
  'modulationenvelope',
  'modtype',
  'modulationtype',
  'osc1',
  'osc2',
  'osc3',
  'osc4',
  'env1',
  'envelope1',
  'env2',
  'envelope2',
  'env3',
  'envelope3',
  'env4',
  'envelope4',
] as const

/** Per named-voice config keyword map for top-level command registration. */
export const SYNTH_NAMED_VOICE_CONFIG: Record<string, readonly string[]> = {
  pulse: SYNTH_OSC_CONFIG_KEYWORDS,
  pwm: SYNTH_OSC_CONFIG_KEYWORDS,
  retro: NOISE_CONFIG_KEYWORDS,
  buzz: NOISE_CONFIG_KEYWORDS,
  clang: NOISE_CONFIG_KEYWORDS,
  metallic: NOISE_CONFIG_KEYWORDS,
  noise: NOISE_CONFIG_KEYWORDS,
  hollow: NOISE_CONFIG_KEYWORDS,
  bells: BELLS_CONFIG_KEYWORDS,
  doot: NOISE_CONFIG_KEYWORDS,
  algo0: ALGO_CONFIG_KEYWORDS,
  algo1: ALGO_CONFIG_KEYWORDS,
  algo2: ALGO_CONFIG_KEYWORDS,
  algo3: ALGO_CONFIG_KEYWORDS,
  algo4: ALGO_CONFIG_KEYWORDS,
  algo5: ALGO_CONFIG_KEYWORDS,
  algo6: ALGO_CONFIG_KEYWORDS,
  algo7: ALGO_CONFIG_KEYWORDS,
  string: STRING_CONFIG_KEYWORDS,
  pluck: PLUCK_CONFIG_KEYWORDS,
  flute: WIND_CONFIG_KEYWORDS,
  clarinet: WIND_CONFIG_KEYWORDS,
  brass: WIND_CONFIG_KEYWORDS,
  piano: PIANO_CONFIG_KEYWORDS,
  violin: BOWED_CONFIG_KEYWORDS,
  steel: GUITAR_CONFIG_KEYWORDS,
  tonewheel: ORGAN_CONFIG_KEYWORDS,
}
