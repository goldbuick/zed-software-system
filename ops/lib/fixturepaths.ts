import path from 'node:path'

/** Repo-root `./ops/fixtures/` — single owner for all test fixture assets. */
function fixturepath(...rel: string[]): string {
  const base = path.join(process.cwd(), 'ops/fixtures')
  return rel.length ? path.join(base, ...rel) : base
}

export const FIXTURES_ROOT = fixturepath()

export const LANG_PARITY_DIR = fixturepath('lang', 'parity')
export const LANG_INTEGRATION_GOLDENS_DIR = fixturepath('lang', 'integration')
export const LANG_SCRIPTS_DIR = fixturepath('lang', 'scripts')
export const LANG_COOLREGIONSBOW_DIR = fixturepath('lang', 'coolregionsbow')

export const MEMORY_WASM_FIXTURES_DIR = fixturepath('memory', 'wasm')

export const SYNTH_WASM_FIXTURES_DIR = fixturepath('synth', 'wasm')
export const SYNTH_DAISY_FIXTURES_DIR = fixturepath('synth', 'daisy')
export const SYNTH_MAXI_FIXTURES_DIR = fixturepath('synth', 'maxi')

export const LANG_ZZTOOP_DIR = fixturepath('lang', 'zztoop')
export const LANG_ZZTOOP_MANIFEST_PATH = fixturepath(
  'lang',
  'zztoop',
  'manifest.json',
)
export const LANG_ZZTOOP_REPORT_PATH = fixturepath(
  'lang',
  'zztoop',
  'failure-report.json',
)

export const PARSE_FIXTURES_DIR = fixturepath('parse')
export const WANIX_FIXTURES_DIR = fixturepath('wanix')
/** Built wanix binaries; dev-served at /fixtures/wanix/ via ops/public/ */
export const WANIX_PUBLIC_FIXTURES_DIR = path.join(
  process.cwd(),
  'ops',
  'public',
  'wanix',
)
/** Dev-served static assets at /fixtures/ (ops/public/, not cafe/public). */
export const PUBLIC_FIXTURES_DIR = path.join(process.cwd(), 'ops', 'public')
/** Offline Daisy/synth render outputs (wav/json/txt); dev-served at /renders/ */
export const RENDERS_FIXTURES_DIR = path.join(
  process.cwd(),
  'ops',
  'public',
  'renders',
)
export const TRAINING_CORPUS_DIR = fixturepath('generated', 'training')

export const COOLREGIONSBOW_BOOK_JSON_PATH = fixturepath(
  'books',
  'example-coolregionsbow.book.json',
)

export const LANG_PARITY_MANIFEST_PATH = fixturepath(
  'lang',
  'parity',
  'manifest.json',
)
export const LANG_INTEGRATION_MANIFEST_PATH = fixturepath(
  'lang',
  'integration',
  'manifest.json',
)
export const LANG_COOLREGIONSBOW_MANIFEST_PATH = fixturepath(
  'lang',
  'coolregionsbow',
  'manifest.json',
)

export const CONTENT_FIXTURES_DIR = fixturepath('content')
export const CONTENT_TEMPLATES_DIR = fixturepath('content', 'templates')
/** Built importable book JSON; drag-drop from ops/public/books/ */
export const CONTENT_DIST_DIR = path.join(
  process.cwd(),
  'ops',
  'public',
  'books',
)

export const ZZT_CORPUS_DIR = fixturepath('zzt', 'corpus')
export const ZZT_CORPUS_EXTRACTED_DIR = fixturepath(
  'zzt',
  'corpus',
  'extracted',
)
export const ZZT_CORPUS_ZSS_DIR = fixturepath('zzt', 'corpus', 'zss')
export const ZZT_CORPUS_MANIFEST_PATH = fixturepath(
  'zzt',
  'corpus',
  'manifest.json',
)
export const ZZT_CORPUS_ZSS_MANIFEST_PATH = fixturepath(
  'zzt',
  'corpus',
  'zss',
  'manifest.json',
)
export const ZZT_CORPUS_SCREENSHOTS_DIR = fixturepath(
  'zzt',
  'corpus',
  'screenshots',
)
export const ZZT_CORPUS_SCREENSHOTS_MANIFEST_PATH = fixturepath(
  'zzt',
  'corpus',
  'screenshots',
  'manifest.json',
)

export const CONTENT_MINIMAL_MANIFEST_PATH = fixturepath(
  'content',
  'templates',
  'minimal',
  'manifest.json',
)
export const CONTENT_DEMO_MANIFEST_PATH = fixturepath(
  'content',
  'templates',
  'demo',
  'manifest.json',
)
