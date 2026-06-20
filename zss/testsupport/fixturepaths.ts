import path from 'node:path'

/** Repo-root `./ops/fixtures/` — single owner for all test fixture assets. */
export const FIXTURES_ROOT = path.join(process.cwd(), 'ops/fixtures')

export const LANG_PARITY_DIR = path.join(FIXTURES_ROOT, 'lang/parity')
export const LANG_INTEGRATION_GOLDENS_DIR = path.join(
  FIXTURES_ROOT,
  'lang/integration',
)
export const LANG_SCRIPTS_DIR = path.join(FIXTURES_ROOT, 'lang/scripts')
export const LANG_COOLREGIONSBOW_DIR = path.join(
  FIXTURES_ROOT,
  'lang/coolregionsbow',
)

export const MEMORY_WASM_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'memory/wasm')

export const SYNTH_WASM_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'synth/wasm')
export const SYNTH_DAISY_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'synth/daisy')
export const SYNTH_MAXI_ARCHIVE_FIXTURES_DIR = path.join(
  FIXTURES_ROOT,
  'synth/archive/maxi',
)

export const PARSE_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'parse')
export const WANIX_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'wanix')
export const HARNESS_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'harness')
/** Offline Daisy/synth render outputs (wav/json/txt); served at /renders/ in dev only. */
export const RENDERS_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'renders')
export const E2E_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'e2e')
export const TRAINING_CORPUS_DIR = path.join(
  FIXTURES_ROOT,
  'generated/training',
)

export const COOLREGIONSBOW_BOOK_JSON_PATH = path.join(
  FIXTURES_ROOT,
  'books/example-coolregionsbow.book.json',
)

export const LANG_PARITY_MANIFEST_PATH = path.join(
  LANG_PARITY_DIR,
  'manifest.json',
)
export const LANG_INTEGRATION_MANIFEST_PATH = path.join(
  LANG_INTEGRATION_GOLDENS_DIR,
  'manifest.json',
)
export const LANG_COOLREGIONSBOW_MANIFEST_PATH = path.join(
  LANG_COOLREGIONSBOW_DIR,
  'manifest.json',
)

export const HOST_MEMORY_REPRO_FIXTURE_PATH = path.join(
  E2E_FIXTURES_DIR,
  'host-memory-repro.json',
)

export const CONTENT_FIXTURES_DIR = path.join(FIXTURES_ROOT, 'content')
export const CONTENT_TEMPLATES_DIR = path.join(
  CONTENT_FIXTURES_DIR,
  'templates',
)
export const CONTENT_DIST_DIR = path.join(CONTENT_FIXTURES_DIR, 'dist')

export const ZZT_CORPUS_DIR = path.join(FIXTURES_ROOT, 'zzt/corpus')
export const ZZT_CORPUS_EXTRACTED_DIR = path.join(ZZT_CORPUS_DIR, 'extracted')
export const ZZT_CORPUS_ZSS_DIR = path.join(ZZT_CORPUS_DIR, 'zss')
export const ZZT_CORPUS_MANIFEST_PATH = path.join(ZZT_CORPUS_DIR, 'manifest.json')
export const ZZT_CORPUS_ZSS_MANIFEST_PATH = path.join(
  ZZT_CORPUS_ZSS_DIR,
  'manifest.json',
)
export const ZZT_CORPUS_SCREENSHOTS_DIR = path.join(ZZT_CORPUS_DIR, 'screenshots')
export const ZZT_CORPUS_SCREENSHOTS_MANIFEST_PATH = path.join(
  ZZT_CORPUS_SCREENSHOTS_DIR,
  'manifest.json',
)

export const CONTENT_MINIMAL_MANIFEST_PATH = path.join(
  CONTENT_TEMPLATES_DIR,
  'minimal/manifest.json',
)
export const CONTENT_DEMO_MANIFEST_PATH = path.join(
  CONTENT_TEMPLATES_DIR,
  'demo/manifest.json',
)
