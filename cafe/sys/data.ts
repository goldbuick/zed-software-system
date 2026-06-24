export type Audience = 'Dev' | 'Creator' | 'Both'
export type Tab = 'map' | 'glossary' | 'features'
export type DiagramLayer = 'stack' | 'realms' | 'tick' | 'script'

export type DiagramNode = {
  id: string
  label: string
  definition: string
  audience: Audience
  path?: string
}

export type DiagramConfig = {
  nodes: DiagramNode[]
  edges: { from: string; to: string }[]
  direction: 'vertical' | 'horizontal'
  nodeWidth?: number
  nodeHeight?: number
}

export type GlossaryEntry = {
  term: string
  category: string
  audience: Audience
  definition: string
  related: string
  path?: string
}

export type FeatureRow = [string, Audience, string, string]

export type FeatureDomain = {
  title: string
  color: string
  features: FeatureRow[]
}

export const DIAGRAM_LAYERS: {
  id: DiagramLayer
  label: string
  audience: Audience
}[] = [
  { id: 'stack', label: 'Product stack', audience: 'Both' },
  { id: 'realms', label: 'Realms & workers', audience: 'Dev' },
  { id: 'tick', label: 'Tick loop', audience: 'Dev' },
  { id: 'script', label: 'Script pipeline', audience: 'Both' },
]

export const DIAGRAMS: Record<DiagramLayer, DiagramConfig> = {
  stack: {
    direction: 'vertical',
    nodeWidth: 200,
    nodeHeight: 40,
    nodes: [
      {
        id: 'zedcafe',
        label: 'ZED Cafe (browser)',
        definition:
          'The Vite/React SPA at zed.cafe. Users interact with the fantasy terminal UI here.',
        audience: 'Both',
        path: 'cafe/index.tsx',
      },
      {
        id: 'tape',
        label: 'Tape terminal',
        definition:
          'Bottom terminal for # commands, history, autocomplete, and reference scrolls.',
        audience: 'Creator',
        path: 'zss/screens/tape/',
      },
      {
        id: 'editor',
        label: 'Code editor',
        definition:
          'Edit codepages (boards, objects, terrain, loaders) with syntax help from ROM.',
        audience: 'Creator',
        path: 'zss/screens/tape/',
      },
      {
        id: 'inspector',
        label: 'Inspector (#gadget)',
        definition:
          'Built-in level editor: inspect elements, batch copy, remix, style brush.',
        audience: 'Creator',
        path: 'zss/memory/docs/inspection.md',
      },
      {
        id: 'display',
        label: 'R3F display',
        definition:
          'Three.js orthographic renderer for tile layers, sprites, dither, and CRT effects.',
        audience: 'Both',
        path: 'zss/gadget/display/',
      },
      {
        id: 'engine',
        label: 'Engine',
        definition:
          'Bootstraps createplatform(), mounts the render loop and tape UI.',
        audience: 'Dev',
        path: 'zss/gadget/engine.tsx',
      },
      {
        id: 'register',
        label: 'register device',
        definition:
          'Main-thread UI edge: storage, zustand stores, emits vm:* messages for user actions.',
        audience: 'Dev',
        path: 'zss/device/register.ts',
      },
      {
        id: 'simvm',
        label: 'Sim VM worker',
        definition:
          'Authoritative game logic: owns MEMORY, runs ticktock, elects boardrunners.',
        audience: 'Dev',
        path: 'zss/device/vm.ts',
      },
      {
        id: 'boardrunner',
        label: 'Boardrunner worker',
        definition:
          'Per-board chip simulation for the elected player on each active board.',
        audience: 'Dev',
        path: 'zss/device/boardrunner.ts',
      },
      {
        id: 'wanix',
        label: 'Wanix sandbox',
        definition:
          'In-page <wanix-system> orchestrated by wanixhost.ts; on main / view (#frame) both tasks and VMs use wanix-iframe-host.html; serial mirrors to tape tile.',
        audience: 'Dev',
        path: 'zss/feature/wanix/wanixhost.ts',
      },
      {
        id: 'heavy',
        label: 'Heavy worker',
        definition:
          'Eager worker for LLM copilot sessions; models load on demand; WebGPU via GPU coordinator.',
        audience: 'Dev',
        path: 'zss/device/heavy.ts',
      },
      {
        id: 'memory',
        label: 'MEMORY',
        definition:
          'Singleton authoritative world state: books, boards, elements, session, operator.',
        audience: 'Both',
        path: 'zss/memory/session.ts',
      },
      {
        id: 'chips',
        label: 'CHIPs',
        definition:
          'Per-element script VMs that execute compiled codepage logic each tick.',
        audience: 'Both',
        path: 'zss/chip.ts',
      },
      {
        id: 'firmware',
        label: 'Firmware',
        definition:
          '#command vocabulary composed into CLI, LOADER, and RUNTIME drivers.',
        audience: 'Both',
        path: 'zss/firmware/runner.ts',
      },
    ],
    edges: [
      { from: 'zedcafe', to: 'tape' },
      { from: 'zedcafe', to: 'editor' },
      { from: 'zedcafe', to: 'inspector' },
      { from: 'zedcafe', to: 'display' },
      { from: 'zedcafe', to: 'wanix' },
      { from: 'tape', to: 'engine' },
      { from: 'editor', to: 'engine' },
      { from: 'inspector', to: 'engine' },
      { from: 'display', to: 'engine' },
      { from: 'engine', to: 'register' },
      { from: 'wanix', to: 'register' },
      { from: 'register', to: 'simvm' },
      { from: 'register', to: 'boardrunner' },
      { from: 'register', to: 'heavy' },
      { from: 'simvm', to: 'memory' },
      { from: 'boardrunner', to: 'memory' },
      { from: 'memory', to: 'chips' },
      { from: 'chips', to: 'firmware' },
    ],
  },
  realms: {
    direction: 'horizontal',
    nodeWidth: 160,
    nodeHeight: 36,
    nodes: [
      {
        id: 'mregister',
        label: 'register',
        definition:
          'UI edge on main thread: terminal, editor, storage, vm calls, workstatus.',
        audience: 'Dev',
        path: 'zss/device/register.ts',
      },
      {
        id: 'mgadget',
        label: 'gadgetclient',
        definition:
          'Applies gadgetclient:paint/patch into zustand for rendering.',
        audience: 'Dev',
        path: 'zss/device/gadgetclient.ts',
      },
      {
        id: 'mbridge',
        label: 'bridge',
        definition: 'PeerJS multiplayer, fetch, streams, chat connectors.',
        audience: 'Dev',
        path: 'zss/device/bridge.ts',
      },
      {
        id: 'msynth',
        label: 'synth',
        definition:
          'Daisy WASM synth device: play, voices, FX; TTS playback routing on main thread.',
        audience: 'Dev',
        path: 'zss/device/synth.ts',
      },
      {
        id: 'mwanix',
        label: 'wanix',
        definition:
          'In-page Wanix host + optional iframe term children (wanixtermiframehost.ts); drop/task/VM orchestration.',
        audience: 'Dev',
        path: 'zss/feature/wanix/wanixhost.ts',
      },
      {
        id: 'mmodem',
        label: 'modem (main)',
        definition:
          'Yjs collaborative editing sync and awareness on main thread.',
        audience: 'Dev',
        path: 'zss/device/modem.ts',
      },
      {
        id: 'mhub',
        label: 'hub (main)',
        definition: 'Fan-out message bus; every device receives every message.',
        audience: 'Dev',
        path: 'zss/hub.ts',
      },
      {
        id: 'mforward',
        label: 'forward (main)',
        definition: 'Bridges realms via postMessage; dedupes by message.id.',
        audience: 'Dev',
        path: 'zss/device/forward.ts',
      },
      {
        id: 'svm',
        label: 'vm (sim or stub)',
        definition:
          'Sim worker game device: ticktock, cli, books, boardrunner orchestration; stubspace replaces sim on /join/.',
        audience: 'Dev',
        path: 'zss/device/vm.ts',
      },
      {
        id: 'sstub',
        label: 'stubspace',
        definition:
          'Join-mode stub VM (no clock/tick); replaces sim when /join/ URL; heavy + boardrunner still eager.',
        audience: 'Dev',
        path: 'zss/stubspace.ts',
      },
      {
        id: 'sclock',
        label: 'clock',
        definition:
          'Emits ticktock and second messages to drive simulation timing.',
        audience: 'Dev',
        path: 'zss/device/clock.ts',
      },
      {
        id: 'smodem',
        label: 'modem (sim)',
        definition: 'Networking/sync message handling on sim worker side.',
        audience: 'Dev',
        path: 'zss/device/modem.ts',
      },
      {
        id: 'shub',
        label: 'hub (sim)',
        definition: 'Separate hub instance in sim worker global scope.',
        audience: 'Dev',
        path: 'zss/hub.ts',
      },
      {
        id: 'sforward',
        label: 'forward (sim)',
        definition:
          'Forwards messages between sim worker and main/other workers.',
        audience: 'Dev',
        path: 'zss/device/forward.ts',
      },
      {
        id: 'brunner',
        label: 'boardrunner',
        definition:
          'Runs memorytickmain for elected board; jsonpipe boundary sync.',
        audience: 'Dev',
        path: 'zss/device/boardrunner.ts',
      },
      {
        id: 'hheavy',
        label: 'heavy',
        definition:
          'Gemma 4 E2B + SmolLM2 intent gate; copilot sessions; models on demand; WebGPU via GPU coordinator.',
        audience: 'Dev',
        path: 'zss/device/heavy.ts',
      },
      {
        id: 'htts',
        label: 'tts (lazy)',
        definition:
          'On-demand Piper/Supertonic TTS inference; spawned on first tts:* message.',
        audience: 'Dev',
        path: 'zss/device/ttsworker.ts',
      },
      {
        id: 'hstt',
        label: 'stt (lazy)',
        definition:
          'On-demand Moonshine speech-to-text; spawned on first stt:* message.',
        audience: 'Dev',
        path: 'zss/device/sttworker.ts',
      },
    ],
    edges: [
      { from: 'mhub', to: 'mforward' },
      { from: 'mforward', to: 'shub' },
      { from: 'mforward', to: 'sstub' },
      { from: 'mforward', to: 'brunner' },
      { from: 'mforward', to: 'hheavy' },
      { from: 'mforward', to: 'htts' },
      { from: 'mforward', to: 'hstt' },
      { from: 'shub', to: 'svm' },
      { from: 'shub', to: 'sclock' },
      { from: 'sstub', to: 'brunner' },
      { from: 'svm', to: 'brunner' },
      { from: 'mregister', to: 'mhub' },
      { from: 'mgadget', to: 'mhub' },
      { from: 'mbridge', to: 'mhub' },
      { from: 'msynth', to: 'mhub' },
      { from: 'mmodem', to: 'mhub' },
      { from: 'mwanix', to: 'mhub' },
    ],
  },
  tick: {
    direction: 'vertical',
    nodeWidth: 220,
    nodeHeight: 40,
    nodes: [
      {
        id: 'clock',
        label: 'clock:ticktock',
        definition: 'Clock device fires ticktock at simulation frame rate.',
        audience: 'Dev',
        path: 'zss/device/clock.ts',
      },
      {
        id: 'vmtick',
        label: 'vm:ticktock',
        definition: 'VM handler orchestrates one simulation frame.',
        audience: 'Dev',
        path: 'zss/device/vm/handlers/ticktock.ts',
      },
      {
        id: 'pilot',
        label: 'pilot + loaders',
        definition: 'Agent pathfinding tick and loader codepage execution.',
        audience: 'Dev',
        path: 'zss/device/vm/handlers/pilot.ts',
      },
      {
        id: 'gsync',
        label: 'gadgetsynctick',
        definition:
          'Projects per-player gadget layers; emits gadgetclient:paint/patch.',
        audience: 'Dev',
        path: 'zss/device/vm/gadgetsynctick.ts',
      },
      {
        id: 'gclient',
        label: 'gadgetclient:paint|patch',
        definition:
          'Main thread replays jsonpipe sync into zustand render state.',
        audience: 'Dev',
        path: 'zss/device/gadgetclient.ts',
      },
      {
        id: 'elect',
        label: 'boardrunnerelect',
        definition:
          'Elects one player per active board as runner; enforces ack budget.',
        audience: 'Dev',
        path: 'zss/device/vm/boardrunnermanagement.ts',
      },
      {
        id: 'brtick',
        label: 'boardrunner:tick',
        definition:
          'Worker receives tick with board id and boundary ids needed.',
        audience: 'Dev',
        path: 'zss/device/boardrunner/handlers/tick.ts',
      },
      {
        id: 'mtick',
        label: 'memorytickmain',
        definition: 'Runs all element CHIP ticks on the board for this frame.',
        audience: 'Dev',
        path: 'zss/memory/runtime.ts',
      },
      {
        id: 'brpatch',
        label: 'boardrunnerpatch',
        definition: 'Worker pushes boundary diffs back to sim VM.',
        audience: 'Dev',
        path: 'zss/device/vm/handlers/boardrunnerpatch.ts',
      },
      {
        id: 'vmpatch',
        label: 'vm:boardrunnerpatch',
        definition: 'Sim applies patches to authoritative MEMORY boundaries.',
        audience: 'Dev',
        path: 'zss/device/vm/handlers/boardrunnerpatch.ts',
      },
    ],
    edges: [
      { from: 'clock', to: 'vmtick' },
      { from: 'vmtick', to: 'pilot' },
      { from: 'vmtick', to: 'gsync' },
      { from: 'gsync', to: 'gclient' },
      { from: 'vmtick', to: 'elect' },
      { from: 'elect', to: 'brtick' },
      { from: 'brtick', to: 'mtick' },
      { from: 'mtick', to: 'brpatch' },
      { from: 'brpatch', to: 'vmpatch' },
    ],
  },
  script: {
    direction: 'vertical',
    nodeWidth: 200,
    nodeHeight: 40,
    nodes: [
      {
        id: 'codepage',
        label: 'Codepage source',
        definition:
          'Board, object, terrain, or loader script text in a book page.',
        audience: 'Creator',
        path: 'zss/memory/types.ts',
      },
      {
        id: 'lang',
        label: 'Lang compile',
        definition:
          'Lexer → parser → visitor → transformer → new Function(api, code).',
        audience: 'Dev',
        path: 'zss/feature/lang/backend/typescript/generator.ts',
      },
      {
        id: 'chip',
        label: 'CHIP tick',
        definition:
          'Element VM runs compiled generator; get/set, messaging, wait.',
        audience: 'Both',
        path: 'zss/chip.ts',
      },
      {
        id: 'fw',
        label: 'Firmware #commands',
        definition:
          'Runtime driver dispatches #go, #put, #play, etc. to memory/gadget APIs.',
        audience: 'Both',
        path: 'zss/firmware/runner.ts',
      },
      {
        id: 'mutate',
        label: 'MEMORY mutation',
        definition:
          'Board elements, flags, player state updated authoritatively in sim.',
        audience: 'Dev',
        path: 'zss/memory/',
      },
      {
        id: 'project',
        label: 'Gadget projection',
        definition:
          'Next ticktock projects mutated memory into render layers for display.',
        audience: 'Both',
        path: 'zss/device/vm/gadgetsynctick.ts',
      },
    ],
    edges: [
      { from: 'codepage', to: 'lang' },
      { from: 'lang', to: 'chip' },
      { from: 'chip', to: 'fw' },
      { from: 'fw', to: 'mutate' },
      { from: 'mutate', to: 'project' },
    ],
  },
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'ZSS',
    category: 'Product',
    audience: 'Both',
    definition:
      'Zed Software System — the full TypeScript monolith: cafe UI, zss engine, and CLI.',
    related: 'cafe, Engine',
    path: 'zss/ARCHITECTURE.md',
  },
  {
    term: 'cafe',
    category: 'Product',
    audience: 'Both',
    definition:
      'Vite/React application shell that hosts the Engine and tape UI.',
    related: 'ZSS, Engine',
    path: 'cafe/',
  },
  {
    term: 'ZED Cafe',
    category: 'Product',
    audience: 'Both',
    definition:
      'Product domain at zed.cafe; also a script dialect extending ZZT-OOP with structural keywords.',
    related: 'cafe, lang',
    path: 'zss/feature/parse/zztoop.ts',
  },
  {
    term: 'Engine',
    category: 'Product',
    audience: 'Both',
    definition:
      'React component that calls createplatform() and renders the R3F terminal scene.',
    related: 'cafe, gadget',
    path: 'zss/gadget/engine.tsx',
  },
  {
    term: 'fantasy terminal',
    category: 'Product',
    audience: 'Creator',
    definition:
      'The retro terminal aesthetic: boards as worlds, # commands as OS, scrolls as help.',
    related: 'tape, gadget',
  },
  {
    term: 'MEMORY',
    category: 'World model',
    audience: 'Both',
    definition:
      'Singleton root of game state: books, software slots, loaders, session, operator.',
    related: 'BOOK, BOARD',
    path: 'zss/memory/session.ts',
  },
  {
    term: 'BOOK',
    category: 'World model',
    audience: 'Both',
    definition:
      'Container for codepages, flags, and activelist; worlds live in books.',
    related: 'CODE_PAGE, MEMORY',
    path: 'zss/memory/types.ts',
  },
  {
    term: 'CODE_PAGE',
    category: 'World model',
    audience: 'Both',
    definition:
      'Editable unit inside a book: board, object, terrain, charset, palette, or loader.',
    related: 'BOOK, codepage types',
  },
  {
    term: 'BOARD',
    category: 'World model',
    audience: 'Both',
    definition:
      '60×25 grid world with terrain array, objects map, exits, camera, and graphics refs.',
    related: 'BOARD_ELEMENT, CODE_PAGE',
    path: 'zss/memory/types.ts',
  },
  {
    term: 'BOARD_ELEMENT',
    category: 'World model',
    audience: 'Both',
    definition:
      'Single cell occupant: kind, char, color, collision, cycle, movement, params p1–p10.',
    related: 'CHIP, kind',
    path: 'zss/memory/types.ts',
  },
  {
    term: 'kind',
    category: 'World model',
    audience: 'Creator',
    definition:
      'Named element type string used in #put, #become, collision, and lookup.',
    related: 'BOARD_ELEMENT, CATEGORY',
    path: 'zss/words/docs/kind.md',
  },
  {
    term: 'collision',
    category: 'World model',
    audience: 'Creator',
    definition:
      'ISWALK, ISSOLID, ISSWIM, ISBULLET, ISGHOST — how elements interact physically.',
    related: 'BOARD_ELEMENT, DIR',
    path: 'zss/words/docs/collision.md',
  },
  {
    term: 'flag',
    category: 'World model',
    audience: 'Both',
    definition:
      'Named boolean or value bag on books, elements, or players for script state.',
    related: 'MEMORY, CHIP',
    path: 'zss/memory/flags.ts',
  },
  {
    term: 'board page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.BOARD — defines a playable level grid and its element layout.',
    related: 'BOARD, object page',
  },
  {
    term: 'object page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.OBJECT — reusable element behavior script bound by kind name.',
    related: 'CHIP, #bind',
  },
  {
    term: 'terrain page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.TERRAIN — background tile definitions for board terrain layer.',
    related: 'BOARD, charset',
  },
  {
    term: 'charset page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.CHARSET — custom character glyph definitions for rendering.',
    related: 'display, palette',
  },
  {
    term: 'palette page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.PALETTE — color remapping table for board graphics.',
    related: 'COLOR, charset',
  },
  {
    term: 'loader page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.LOADER — import handler script run when loading external files.',
    related: 'LOADER driver, parse',
  },
  {
    term: 'scroll page',
    category: 'Codepage types',
    audience: 'Creator',
    definition:
      'CODE_PAGE_TYPE.SCROLL — plain-text notes page (`@scroll <name>`). No ZSS execution; ZNS renders markdown and $ zsstext colors.',
    related: 'refscroll, zns',
  },
  {
    term: 'hub',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Pub/sub message bus per JS realm; emit fan-out invokes every device.handle.',
    related: 'device, message',
    path: 'zss/hub.ts',
  },
  {
    term: 'device',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Message handler registered on a hub: vm, register, boardrunner, synth, etc.',
    related: 'hub, message',
    path: 'zss/device.ts',
  },
  {
    term: 'message',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Routing envelope: session, player, id, sender, target, data. Target is device:path.',
    related: 'hub, api',
    path: 'zss/device/api.ts',
  },
  {
    term: 'forward',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Device that bridges hub messages across workers via postMessage.',
    related: 'hub, platform',
    path: 'zss/device/forward.ts',
  },
  {
    term: 'VM',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Sim-worker vm device — authoritative owner of MEMORY and game tick loop.',
    related: 'boardrunner, ticktock',
    path: 'zss/device/vm.ts',
  },
  {
    term: 'boardrunner',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Elected player whose worker runs chip ticks for one active board.',
    related: 'election, boundary',
    path: 'zss/device/boardrunner.ts',
  },
  {
    term: 'boundary',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Opaque keyed slice of nested memory for efficient jsonpipe partial sync.',
    related: 'paint, patch',
    path: 'zss/memory/boundaries.ts',
  },
  {
    term: 'paint',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Full jsonpipe snapshot sync — replaces entire boundary or gadget document.',
    related: 'patch, jsonpipe',
    path: 'zss/feature/jsonpipe/README.md',
  },
  {
    term: 'patch',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Incremental RFC 6902 jsonpipe diff applied to prior snapshot state.',
    related: 'paint, jsonpipe',
  },
  {
    term: 'jsonpipe',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Snapshot + patch protocol used for gadget, boardrunner, and boundary sync.',
    related: 'paint, patch',
    path: 'zss/feature/jsonpipe/',
  },
  {
    term: 'SOFTWARE',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Session holder with convenient emit() for sending messages as the current player.',
    related: 'register, VM',
    path: 'zss/device/session.ts',
  },
  {
    term: 'ticktock',
    category: 'Simulation',
    audience: 'Dev',
    definition:
      'Primary simulation clock message; one frame of game logic per tick.',
    related: 'clock, VM',
    path: 'zss/device/vm/handlers/ticktock.ts',
  },
  {
    term: 'election',
    category: 'Simulation',
    audience: 'Dev',
    definition:
      'VM picks eligible player on each board as boardrunner; evicts on ack timeout.',
    related: 'boardrunner',
    path: 'zss/device/vm/boardrunnermanagement.ts',
  },
  {
    term: 'memorytickmain',
    category: 'Simulation',
    audience: 'Dev',
    definition:
      'Runs all element CHIP generators on a board for one simulation frame.',
    related: 'CHIP, boardrunner',
    path: 'zss/memory/runtime.ts',
  },
  {
    term: 'pilot',
    category: 'Simulation',
    audience: 'Dev',
    definition:
      'Agent tool pathfinding for register player movement on the current board (#pilot).',
    related: 'agent, heavy',
    path: 'zss/device/vm/handlers/pilot.ts',
  },
  {
    term: 'halt',
    category: 'Simulation',
    audience: 'Both',
    definition: 'Dev mode flag that stops chip execution until cleared (#dev).',
    related: 'operator, dev',
  },
  {
    term: 'frozen',
    category: 'Simulation',
    audience: 'Dev',
    definition: 'Memory flag preventing mutation during certain operations.',
    related: 'MEMORY, halt',
  },
  {
    term: 'CHIP',
    category: 'Scripting',
    audience: 'Both',
    definition:
      'Per-element script VM: compiled code, get/set stats, firmware dispatch, messaging.',
    related: 'firmware, lang',
    path: 'zss/chip.ts',
  },
  {
    term: 'firmware',
    category: 'Scripting',
    audience: 'Both',
    definition:
      'Registry of #commands with hooks; composed into CLI, LOADER, RUNTIME drivers.',
    related: 'CHIP, #command',
    path: 'zss/firmware/runner.ts',
  },
  {
    term: 'CLI driver',
    category: 'Scripting',
    audience: 'Both',
    definition:
      'Firmware context for terminal # input; permission checks apply.',
    related: 'tape, permissions',
  },
  {
    term: 'LOADER driver',
    category: 'Scripting',
    audience: 'Dev',
    definition:
      'Firmware context for file import handlers; no permission checks.',
    related: 'loader page, parse',
  },
  {
    term: 'RUNTIME driver',
    category: 'Scripting',
    audience: 'Both',
    definition: 'Firmware context for codepage chip execution on boards.',
    related: 'CHIP, element commands',
  },
  {
    term: 'lang',
    category: 'Scripting',
    audience: 'Dev',
    definition: 'ZSS script compiler pipeline producing JS for CHIP execution.',
    related: 'compile, CHIP',
    path: 'zss/feature/lang/backend/typescript/generator.ts',
  },
  {
    term: 'words',
    category: 'Scripting',
    audience: 'Both',
    definition:
      'Domain parsers and enums: COLOR, DIR, KIND, STAT_TYPE, collision.',
    related: 'firmware, lang',
    path: 'zss/words/',
  },
  {
    term: '#command',
    category: 'Scripting',
    audience: 'Creator',
    definition:
      'Hash-prefixed firmware directive in terminal or codepages, e.g. #goto, #play.',
    related: 'firmware, CLI driver',
  },
  {
    term: 'DIR',
    category: 'Directions & stats',
    audience: 'Creator',
    definition:
      'Direction vocabulary: N/S/E/W, BY, AT, FLOW, SEEK, CW, WITHIN, BEAM, etc.',
    related: 'collision, #go',
    path: 'zss/words/docs/dir.md',
  },
  {
    term: 'COLOR',
    category: 'Directions & stats',
    audience: 'Creator',
    definition:
      '16 foreground colors plus ON variants, blink, and ONCLEAR for element display.',
    related: 'palette, #color',
    path: 'zss/words/docs/color.md',
  },
  {
    term: 'STAT_TYPE',
    category: 'Directions & stats',
    audience: 'Creator',
    definition:
      'Inspector stat categories: BOARD, OBJECT, RANGE, HOTKEY, CHAREDIT, etc.',
    related: 'inspector, words',
    path: 'zss/words/docs/stats.md',
  },
  {
    term: 'p1–p10',
    category: 'Directions & stats',
    audience: 'Creator',
    definition:
      'Generic numeric params on BOARD_ELEMENT for custom object state.',
    related: 'BOARD_ELEMENT, #set',
  },
  {
    term: 'gadget',
    category: 'UI',
    audience: 'Both',
    definition:
      'Render/UI projection of memory: layers, scrolls, terminal, per-player view.',
    related: 'gadgetclient, layers',
    path: 'zss/gadget/data/zustandstores.ts',
  },
  {
    term: 'tape',
    category: 'UI',
    audience: 'Both',
    definition:
      'Terminal input line and code editor panel with layout modes TOP/FULL/BOTTOM/MAX.',
    related: 'CLI driver, autocomplete',
    path: 'zss/screens/tape/',
  },
  {
    term: 'scroll',
    category: 'UI',
    audience: 'Creator',
    definition:
      'In-world text panel for help, lists, hyperlinks, and reference content.',
    related: 'ROM, #help',
    path: 'zss/gadget/docs/gadget-scrolls.md',
  },
  {
    term: 'inspector',
    category: 'UI',
    audience: 'Creator',
    definition:
      'Visual editor mode (#gadget) for element stats, batch ops, and find-any.',
    related: 'STAT_TYPE, remix',
    path: 'zss/memory/docs/inspection.md',
  },
  {
    term: 'layer',
    category: 'UI',
    audience: 'Both',
    definition:
      'Render plane types: BLANK, TILES, SPRITES, DITHER, MEDIA, CONTROL.',
    related: 'gadget, display',
    path: 'zss/gadget/data/types.ts',
  },
  {
    term: 'CRT',
    category: 'UI',
    audience: 'Creator',
    definition:
      'Post-processing effects giving the display a retro monitor aesthetic.',
    related: 'display, Engine',
  },
  {
    term: 'bridge',
    category: 'Multiplayer',
    audience: 'Both',
    definition:
      'PeerJS device for join codes, tab join, fetch, streams, and chat bridges.',
    related: 'joincode, modem',
    path: 'zss/device/bridge.ts',
  },
  {
    term: 'joincode',
    category: 'Multiplayer',
    audience: 'Creator',
    definition:
      '#joincode — operator starts multiplayer session with shareable URL.',
    related: 'bridge, jointab',
  },
  {
    term: 'modem',
    category: 'Multiplayer',
    audience: 'Dev',
    definition:
      'Yjs CRDT sync for collaborative code editing with cursor awareness.',
    related: 'editor, bridge',
    path: 'zss/device/modem.ts',
  },
  {
    term: 'Yjs',
    category: 'Multiplayer',
    audience: 'Dev',
    definition:
      'CRDT library powering real-time collaborative tape editor sync.',
    related: 'modem, editor',
  },
  {
    term: 'stubspace',
    category: 'Multiplayer',
    audience: 'Dev',
    definition:
      'Join-mode stub VM (/join/ URL) without clock/tick; replaces sim only — heavy and boardrunner still spawn eagerly.',
    related: 'bridge, join',
    path: 'zss/stubspace.ts',
  },
  {
    term: 'operator',
    category: 'Permissions',
    audience: 'Both',
    definition:
      'Privileged session player identity; bypasses all permission checks.',
    related: 'permissions, role',
    path: 'zss/memory/session.ts',
  },
  {
    term: 'role',
    category: 'Permissions',
    audience: 'Both',
    definition:
      'Assignable identity: admin, mod, or player with permission group grants.',
    related: 'permissions, #role',
    path: 'zss/memory/permissions.ts',
  },
  {
    term: 'lockdown',
    category: 'Permissions',
    audience: 'Both',
    definition:
      'Permission preset restricting build, risk, and speaker commands.',
    related: 'creative, #access',
  },
  {
    term: 'creative',
    category: 'Permissions',
    audience: 'Both',
    definition:
      'Permission preset allowing broad build and explore for all players.',
    related: 'lockdown, #access',
  },
  {
    term: 'heavy',
    category: 'Integrations',
    audience: 'Both',
    definition:
      'Eager worker for Gemma 4 E2B copilot LLM and SmolLM2 intent gate; models load on demand off the sim hot path.',
    related: 'agent, GPU coordinator',
    path: 'zss/device/heavy.ts',
  },
  {
    term: 'wanix',
    category: 'Integrations',
    audience: 'Both',
    definition:
      'In-browser WASM sandbox: drop .wasm/.tgz, run tasks or #wanix vm; term I/O via #task/…/term/data or #vm/<rid>/term/data (not WASI stdin); attach-on-serial opens tile.',
    related: 'wanix term bridge, WanixTermScreen',
    path: 'zss/feature/wanix/wanixsession.ts',
  },
  {
    term: 'wanix term bridge',
    category: 'Integrations',
    audience: 'Dev',
    definition:
      'WanixTermInput → sendwanixtermwrite / sendwanixterminput → #…/term/data; guest serial → WanixTermScreen tile.',
    related: 'wanix, attach-on-serial',
    path: 'zss/feature/wanix/wanixhost.ts',
  },
  {
    term: 'attach-on-serial',
    category: 'Integrations',
    audience: 'Both',
    definition:
      'Tape tile opens on first guest stdout or VM serial; replays serial buffer. #wanix attach forces tile immediately.',
    related: 'wanix term bridge, WanixTermScreen',
    path: 'zss/feature/wanix/wanixterminalmode.ts',
  },
  {
    term: 'GPU coordinator',
    category: 'Integrations',
    audience: 'Dev',
    definition:
      'bootgpucoordinator() arbitrates WebGPU access between heavy LLM inference and lazy STT worker.',
    related: 'heavy, sttspace',
    path: 'zss/feature/gpu/gpumain.ts',
  },
  {
    term: 'ttsspace',
    category: 'Integrations',
    audience: 'Dev',
    definition:
      'Lazy-spawned TTS worker for Piper/Supertonic inference; main synth plays returned audio.',
    related: 'TTS, heavy',
    path: 'zss/device/ttsworker.ts',
  },
  {
    term: 'sttspace',
    category: 'Integrations',
    audience: 'Dev',
    definition:
      'Lazy-spawned STT worker for Moonshine speech recognition; mic capture stays on main thread.',
    related: 'speech-to-text, terminal',
    path: 'zss/device/sttworker.ts',
  },
  {
    term: 'TTS',
    category: 'Integrations',
    audience: 'Creator',
    definition:
      'Text-to-speech via Edge (main), Piper, or Supertonic (ttsspace worker) (#tts, #ttsengine).',
    related: 'ttsspace, audio',
    path: 'zss/feature/docs/tts.md',
  },
  {
    term: 'agent',
    category: 'Integrations',
    audience: 'Creator',
    definition:
      '#agent — LLM copilot for the register player; tool calls via vm:query / vm:cli; one agent per tab.',
    related: 'heavy, pilot',
    path: 'zss/feature/docs/heavy.md',
  },
  {
    term: 'ZNS',
    category: 'Integrations',
    audience: 'Creator',
    definition:
      'Zed Name Service for publishing and listing shareable content (#zns).',
    related: 'export, url',
    path: 'zss/feature/url.ts',
  },
  {
    term: 'itch.io',
    category: 'Integrations',
    audience: 'Creator',
    definition:
      '#itchiopublish — export and publish games to itch.io (operator).',
    related: 'export',
    path: 'zss/feature/docs/itchiopublish.md',
  },
  {
    term: 'ZZT Museum',
    category: 'Integrations',
    audience: 'Creator',
    definition:
      '#zztsearch / #zztrandom — browse classic ZZT worlds from museum API.',
    related: 'parse, import',
  },
  {
    term: 'cycle',
    category: 'Simulation',
    audience: 'Creator',
    definition:
      'Element tick rate divisor (1–255); lower cycle = more frequent execution.',
    related: 'CHIP, #cycle',
  },
  {
    term: 'label',
    category: 'Scripting',
    audience: 'Creator',
    definition:
      'Named code block in object scripts; :touch, :shot, custom event handlers.',
    related: 'CHIP, #zap',
  },
  {
    term: 'send',
    category: 'Scripting',
    audience: 'Creator',
    definition:
      'Message dispatched between elements or to labels; core event wiring.',
    related: 'CHIP, firmware',
    path: 'zss/words/docs/send.md',
  },
  {
    term: 'ROM',
    category: 'UI',
    audience: 'Both',
    definition:
      'Built-in help markdown: editor hints, refscrolls, command documentation.',
    related: 'scroll, autocomplete',
    path: 'zss/feature/docs/rom.md',
  },
  {
    term: 'register device',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Main-thread edge translating UI events into vm:* hub messages; handles workstatus and sessionreset.',
    related: 'SOFTWARE, tape',
    path: 'zss/device/register.ts',
  },
  {
    term: 'desync',
    category: 'Runtime',
    audience: 'Dev',
    definition:
      'Recovery path when jsonpipe patch fails; triggers full paint resync.',
    related: 'paint, patch',
  },
  {
    term: 'MEMORY_LABEL',
    category: 'World model',
    audience: 'Dev',
    definition:
      'Software slot ids: MAIN, TEMP, TITLE, PLAYER for session state routing.',
    related: 'MEMORY, fork',
    path: 'zss/memory/types.ts',
  },
]

export const GLOSSARY_CATEGORIES = [
  'All',
  ...Array.from(new Set(GLOSSARY.map((g) => g.category))).sort(),
]

export const FEATURE_DOMAINS: FeatureDomain[] = [
  {
    title: 'Terminal & CLI',
    color: 'blue',
    features: [
      [
        '#help — reference scroll',
        'Creator',
        'Open in-world help and command documentation.',
        '#help',
      ],
      [
        '#books / #pages / #boards',
        'Creator',
        'List books, pages, and board goto hyperlinks.',
        '#books',
      ],
      [
        '#pageopen / #boardopen',
        'Creator',
        'Open codepage editor or teleport player to board.',
        '#pageopen',
      ],
      [
        '#gadget',
        'Creator',
        'Toggle built-in inspector for element editing.',
        '#gadget',
      ],
      [
        '#findany',
        'Creator',
        'Highlight elements matching a search pattern.',
        '#findany',
      ],
      [
        '#dev / #save / #fork',
        'Both',
        'Operator dev mode, flush changes, fork software slot.',
        '#dev',
      ],
      [
        '#nuke / #restart',
        'Both',
        'Operator reset: countdown wipe or restart chip/player state.',
        '#nuke',
      ],
      [
        '#export / #bookallexport',
        'Both',
        'Export menus and JSON book/page export (operator).',
        '#export',
      ],
      [
        '#zztsearch / #zztrandom',
        'Creator',
        'Search or random ZZT Museum content.',
        '#zztsearch',
      ],
      [
        '#admin',
        'Both',
        'Show admin interface for session moderation.',
        '#admin',
      ],
      [
        '#joincode / #jointab',
        'Both',
        'Start or join multiplayer via code or tab (operator for host).',
        '#joincode',
      ],
      [
        '#chat / #broadcast',
        'Both',
        'Chat bridges and stream broadcast control.',
        '#chat',
      ],
      [
        '#zns',
        'Creator',
        'ZNS login, list, publish, delete published content.',
        '#zns',
      ],
      [
        '#agent',
        'Creator',
        'LLM copilot session for register player with tool calls (operator).',
        '#agent',
      ],
      [
        '#screenshot',
        'Both',
        'Capture display screenshot (operator).',
        '#screenshot',
      ],
      [
        '#wanix',
        'Creator',
        'Run dropped .wasm/.tgz; attach, detach, stop; vm / vm stop for Linux VM.',
        '#wanix',
      ],
      [
        '#endgame',
        'Both',
        'End current game session and return to title flow.',
        '#endgame',
      ],
      [
        '#bookrename / #pagetrash / #trash',
        'Creator',
        'Rename books or trash pages and books.',
        '#bookrename',
      ],
      [
        '#pageexport / #bookexport',
        'Both',
        'Export single page or full book JSON.',
        '#pageexport',
      ],
      ['#ttsvol', 'Creator', 'Set TTS playback volume level.', '#ttsvol'],
      [
        'Speech-to-text (mic)',
        'Creator',
        'Pause-based mic input on tape; lazy sttspace worker transcribes.',
        'zss/screens/terminal/input.tsx',
      ],
    ],
  },
  {
    title: 'Code editor & tape',
    color: 'green',
    features: [
      [
        'Tape layout modes',
        'Creator',
        'TOP, FULL, BOTTOM, MAX — resize terminal/editor split.',
        'Tab / layout keys',
      ],
      [
        'Command autocomplete',
        'Creator',
        'Lexer-driven # command and word-list suggestions.',
        'zss/screens/tape/autocomplete.ts',
      ],
      [
        'ROM command hints',
        'Creator',
        'Long-form help from editor:commands:<name> markdown.',
        'zss/screens/tape/commandarghints.ts',
      ],
      [
        'Collaborative editing',
        'Both',
        'Yjs CRDT sync with cursor/selection awareness.',
        'zss/device/modem.ts',
      ],
      [
        'Editor bookmarks',
        'Creator',
        'Save/run CLI lines, snippets, and URLs.',
        '#bookmark scroll handlers',
      ],
      [
        'Syntax highlighting',
        'Creator',
        'Tape editor highlights ZSS lang tokens and stats.',
        'zss/screens/editor/',
      ],
    ],
  },
  {
    title: 'Inspector & gadget tools',
    color: 'purple',
    features: [
      [
        'Element inspection',
        'Creator',
        'View and edit BOARD_ELEMENT stats in place.',
        '#gadget',
      ],
      [
        'Batch copy/paste',
        'Creator',
        'Multi-select elements for clipboard operations.',
        'inspectionbatch.md',
      ],
      [
        'Remix',
        'Creator',
        'Pattern-based board region remix from source.',
        '#remix',
      ],
      [
        'Make-it',
        'Creator',
        'Generate elements from inspector templates.',
        'inspectionmakeit.md',
      ],
      [
        'Find-any',
        'Creator',
        'Search and highlight elements across board.',
        '#findany',
      ],
      [
        'Style brush',
        'Creator',
        'Paint element char/color/style onto targets.',
        'inspectionstyle.md',
      ],
      [
        'Gadget scrolls',
        'Creator',
        'In-world UI panels driven by gadget layer.',
        'zss/gadget/docs/gadget-scrolls.md',
      ],
    ],
  },
  {
    title: 'Board & world building',
    color: 'orange',
    features: [
      ['#build', 'Creator', 'Create new board and write id to stat.', '#build'],
      [
        '#goto / #transport',
        'Creator',
        'Teleport player or move elements across boards.',
        '#goto',
      ],
      ['#put / #putwith', 'Creator', 'Place elements in a direction.', '#put'],
      [
        '#shoot / #throwstar',
        'Creator',
        'Fire projectiles with optional kind/args.',
        '#shoot',
      ],
      [
        '#duplicate / #change',
        'Creator',
        'Clone or transform elements by kind.',
        '#duplicate',
      ],
      [
        '#write',
        'Creator',
        'Write text string to board at direction.',
        '#write',
      ],
      [
        '#shove / #push',
        'Creator',
        'Move pushable objects in direction.',
        '#shove',
      ],
      [
        '#snapshot / #revert',
        'Creator',
        'Save and restore board state snapshots.',
        '#snapshot',
      ],
      [
        '#copy / #remix / #weave / #pivot',
        'Creator',
        'Region copy, remix, weave, and rotate transforms.',
        '#copy',
      ],
    ],
  },
  {
    title: 'Element scripting',
    color: 'yellow',
    features: [
      [
        '#go / #walk / #idle',
        'Creator',
        'Move element, continuous walk, or yield tick.',
        '#go',
      ],
      [
        '#become / #bind',
        'Creator',
        'Transform kind or copy code from named element.',
        '#become',
      ],
      [
        '#set / #clear / #array',
        'Creator',
        'Variable and array state on element.',
        '#set',
      ],
      [
        '#run / #runwith',
        'Creator',
        'Invoke object codepage by name with optional arg.',
        '#run',
      ],
      [
        '#die / #zap / #restore',
        'Creator',
        'Lifecycle: delete element, deactivate label, restore labels.',
        '#die',
      ],
      [
        '#lock / #unlock',
        'Creator',
        'Block or allow external messages during execution.',
        '#lock',
      ],
      ['#cycle', 'Creator', 'Set element tick rate divisor 1–255.', '#cycle'],
      [
        '#char / #color',
        'Creator',
        'Set display char/color on self or at direction.',
        '#char',
      ],
      [
        '#toast / #ticker',
        'Creator',
        'UI toast notification or sidebar ticker text.',
        '#toast',
      ],
    ],
  },
  {
    title: 'Audio & synth',
    color: 'pink',
    features: [
      [
        '#play / #bgplay',
        'Creator',
        'Play note sequences foreground or background.',
        '#play',
      ],
      [
        '#vol / #bgvol',
        'Creator',
        'Set play and background volume levels.',
        '#vol',
      ],
      [
        '#synth / #synth1–5',
        'Creator',
        'Configure Daisy multi-voice synth for #play/bgplay.',
        '#synth',
      ],
      [
        'Daisy WASM backend',
        'Dev',
        'Production synth: AudioWorklet + shared-array-buffer path.',
        'zss/feature/synth/backend/daisy/',
      ],
      [
        '#synthrecord / #synthflush',
        'Creator',
        'Record synth output to file or clear saved notes.',
        '#synthrecord',
      ],
      [
        'FX: echo/reverb/distort',
        'Creator',
        'Multi-voice effects on play channels.',
        '#echo',
      ],
      [
        'Per-voice FX 1–3',
        'Creator',
        'Individual echo/fcrush/autofilter/reverb/distort/vibrato/autowah.',
        '#echo1',
      ],
      [
        '#tts / #ttsengine',
        'Creator',
        'Text-to-speech speak, queue, engine config.',
        '#tts',
      ],
      [
        'Drums & AlgoSynth',
        'Creator',
        'Percussion voices and FM algorithm synthesis.',
        'zss/feature/synth/docs/drums.md',
      ],
      [
        'MP3 recording',
        'Creator',
        'Record audio output to MP3 file.',
        'zss/feature/synth/docs/record-and-mp3.md',
      ],
    ],
  },
  {
    title: 'Import / export / parse',
    color: 'yellow',
    features: [
      [
        'JSON export/import',
        'Both',
        'Book and codepage JSON via export commands.',
        '#bookallexport',
      ],
      [
        'ZZT world import',
        'Creator',
        'Parse classic ZZT .zzt worlds into books.',
        'zss/feature/docs/parse.md',
      ],
      [
        'BRD / ANSI / CHR',
        'Creator',
        'Board, ANSI art, and charset file parsers.',
        'zss/feature/parse/',
      ],
      [
        'ZIP / OBJ / markdown',
        'Creator',
        'Archive and object format loaders.',
        'LOADER driver',
      ],
      [
        'MIDI import',
        'Creator',
        'Convert MIDI files to play notation.',
        'zss/feature/parse/docs/midi-import.md',
      ],
      [
        'itch.io publish',
        'Creator',
        'Package and publish to itch.io platform.',
        '#itchiopublish',
      ],
    ],
  },
  {
    title: 'Multiplayer & social',
    color: 'blue',
    features: [
      [
        'PeerJS join codes',
        'Both',
        'Share zed.cafe/join/#code URLs for sessions.',
        '#joincode',
      ],
      [
        'Tab join',
        'Both',
        'Join multiplayer session from another browser tab.',
        '#jointab',
      ],
      [
        'Hidden sessions',
        'Both',
        'Join clients use stubspace (no sim tick); host runs authoritative sim.',
        '/join/ URL',
      ],
      [
        'Stream broadcast',
        'Both',
        'Start/stop live stream broadcast.',
        '#broadcast',
      ],
      [
        'Twitch chat bridge',
        'Both',
        'Connect Twitch chat to in-game terminal.',
        'bridge/twitchchatconnector.ts',
      ],
      [
        'RSS / Mastodon / Bluesky',
        'Both',
        'Social feed chat connectors.',
        'bridge/chatconnector.ts',
      ],
      [
        'Net terminal',
        'Both',
        'P2P terminal sharing via terminal.zed.cafe.',
        'zss/feature/docs/netterminal.md',
      ],
    ],
  },
  {
    title: 'Wanix & WASM sandbox',
    color: 'gray',
    features: [
      [
        '#wanix',
        'Creator',
        'Show status, stop/replace/keep pending drop, attach/detach terminal routing, vm subcommands.',
        '#wanix',
      ],
      [
        '#wanix vm',
        'Creator',
        'Prep Linux+v86 VM in wanix-iframe-host.html iframe; serial console via term bridge.',
        '#wanix vm',
      ],
      [
        'Terminal drop',
        'Creator',
        'Drag .wasm or .tgz onto tape; mounts via in-page Wanix or hidden iframe host (route-dependent).',
        'zss/feature/wanix/wanixdrop.ts',
      ],
      [
        'Wanix term tile',
        'Both',
        'WanixTermScreen grid + WanixTermInput when tape is in attached mode.',
        'zss/feature/wanix/wanixtermscreen.ts',
      ],
      [
        'Terminal I/O bridge',
        'Dev',
        'Serial via iframe child xterm → cell snapshots → tile; prep logs to apilog only.',
        'zss/feature/wanix/wanixhost.ts',
      ],
      [
        'Task iframe host',
        'Dev',
        'Hidden iframe child: WASI task RPC + xterm cell probe streaming.',
        'cafe/wanix-iframe-host.ts',
      ],
      [
        'VM iframe host',
        'Dev',
        'wanix-iframe-host.html child: programmatic VM prep/spawn/halt RPC + cell probe streaming.',
        'cafe/wanix-iframe-host.ts',
      ],
      [
        'Wanix spawn HTML',
        'Dev',
        'Declarative bind + vm + term markup in buildwanixvmfullhtml / buildwanixtaskprehtml.',
        'zss/feature/wanix/wanixvmassets.ts',
      ],
    ],
  },
  {
    title: 'AI & heavy worker',
    color: 'purple',
    features: [
      [
        '#agent',
        'Creator',
        'LLM copilot for register player with tool calls (operator).',
        '#agent',
      ],
      [
        'Model presets',
        'Dev',
        'Gemma 4 E2B in-browser agent LLM; single supported preset (#agent model for info).',
        'heavy:llmpreset',
      ],
      [
        'GPU coordinator',
        'Dev',
        'Arbitrates WebGPU between heavy LLM and lazy STT worker.',
        'zss/feature/gpu/gpumain.ts',
      ],
      [
        'TTS engines',
        'Creator',
        'Edge on main; Piper/Supertonic in lazy ttsspace worker.',
        'zss/feature/docs/tts.md',
      ],
      [
        'Pilot pathfinding',
        'Dev',
        'Copilot tool: auto-navigation for register player on current board.',
        'vm:pilotstart/stop',
      ],
      [
        'Speech-to-text',
        'Creator',
        'Moonshine ONNX in lazy sttspace worker; mic on main thread.',
        'zss/feature/docs/speechtotext.md',
      ],
    ],
  },
  {
    title: 'Permissions & moderation',
    color: 'gray',
    features: [
      [
        '9 permission groups',
        'Both',
        'bridge, build, coder, explore, moderation, persist, risk, roles, speaker.',
        'zss/memory/permissions.ts',
      ],
      [
        '#permissions',
        'Both',
        'View current permission configuration.',
        '#permissions',
      ],
      [
        '#access lockdown/creative',
        'Both',
        'Apply preset permission profiles.',
        '#access',
      ],
      [
        '#allow / #revoke',
        'Both',
        'Grant or remove command group access for roles.',
        '#allow',
      ],
      ['#role', 'Both', 'Assign admin/mod/player role to players.', '#role'],
      [
        'Operator bypass',
        'Both',
        'Session operator skips all permission checks.',
        'vm:operator',
      ],
    ],
  },
  {
    title: 'Storage & session',
    color: 'green',
    features: [
      [
        'IndexedDB persistence',
        'Both',
        'Config, CLI history, bookmarks, permissions stored locally.',
        'zss/feature/docs/storage.md',
      ],
      [
        'Player token / login',
        'Both',
        'Session auth via vm:login/logout handlers.',
        'zss/device/vm/handlers/auth.ts',
      ],
      [
        'Share registration',
        'Both',
        'Operator registers shareable session state.',
        '#share',
      ],
      [
        'Agent roster',
        'Both',
        'Persisted agent configuration for heavy worker.',
        'zss/feature/docs/storage.md',
      ],
    ],
  },
  {
    title: 'Rendering & input',
    color: 'orange',
    features: [
      [
        'Layer compositing',
        'Both',
        'BLANK, TILES, SPRITES, DITHER, MEDIA, CONTROL layers.',
        'LAYER_TYPE enum',
      ],
      [
        'Sprite rendering',
        'Both',
        'Shader-based per-player sprite overlays in R3F.',
        'zss/gadget/display/sprites.ts',
      ],
      [
        'Board lighting',
        'Creator',
        'Dark boards with element light radius/dir.',
        'zss/memory/docs/board-lighting.md',
      ],
      [
        'Keyboard + gamepad',
        'Creator',
        'Move, shoot, ok, cancel, menu, modifier keys.',
        'zss/gadget/userinput.tsx',
      ],
      [
        'View scale',
        'Creator',
        'Adjust display zoom level for boards.',
        'VIEWSCALE',
      ],
      [
        'Capture / screenshot',
        'Both',
        'Frame capture for export and #screenshot.',
        'zss/gadget/capture/',
      ],
    ],
  },
  {
    title: 'CLI / headless',
    color: 'blue',
    features: [
      [
        'zss oclif binary',
        'Dev',
        'Run cafe SPA in Playwright with Ink terminal overlay.',
        'headless/src/commands/run.ts',
      ],
      [
        'Headless boot',
        'Dev',
        'bootheadless() skips Canvas; same message stack.',
        'cafe/index.tsx',
      ],
      [
        'Node storage hooks',
        'Dev',
        'CLI injects __nodeStorageReadPlayer for persistence.',
        'headless/src/lib/app.tsx',
      ],
      [
        'Dev server mode',
        'Dev',
        'Attach to existing Vite dev server instead of cafe/dist.',
        'zss run --dev',
      ],
    ],
  },
]

export const TAB_LABELS: Record<Tab, string> = {
  map: 'System Map',
  glossary: 'Glossary',
  features: 'Features',
}
