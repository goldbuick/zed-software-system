var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import path from 'node:path';
/** Repo-root `./ops/fixtures/` — single owner for all test fixture assets. */
function fixturepath() {
    var rel = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        rel[_i] = arguments[_i];
    }
    var base = path.join(process.cwd(), 'ops/fixtures');
    return rel.length ? path.join.apply(path, __spreadArray([base], rel, false)) : base;
}
export var FIXTURES_ROOT = fixturepath();
export var LANG_PARITY_DIR = fixturepath('lang', 'parity');
export var LANG_INTEGRATION_GOLDENS_DIR = fixturepath('lang', 'integration');
export var LANG_SCRIPTS_DIR = fixturepath('lang', 'scripts');
export var LANG_COOLREGIONSBOW_DIR = fixturepath('lang', 'coolregionsbow');
export var MEMORY_WASM_FIXTURES_DIR = fixturepath('memory', 'wasm');
export var SYNTH_WASM_FIXTURES_DIR = fixturepath('synth', 'wasm');
export var SYNTH_DAISY_FIXTURES_DIR = fixturepath('synth', 'daisy');
export var SYNTH_MAXI_FIXTURES_DIR = fixturepath('synth', 'maxi');
export var LANG_ZZTOOP_DIR = fixturepath('lang', 'zztoop');
export var LANG_ZZTOOP_MANIFEST_PATH = fixturepath('lang', 'zztoop', 'manifest.json');
export var LANG_ZZTOOP_REPORT_PATH = fixturepath('lang', 'zztoop', 'failure-report.json');
export var PARSE_FIXTURES_DIR = fixturepath('parse');
export var WANIX_FIXTURES_DIR = fixturepath('wanix');
/** Dev-served copy at /fixtures/wanix/ */
export var WANIX_PUBLIC_FIXTURES_DIR = fixturepath('public', 'wanix');
/** Dev-served static assets at /fixtures/ (not shipped in cafe/public). */
export var PUBLIC_FIXTURES_DIR = fixturepath('public');
/** Offline Daisy/synth render outputs (wav/json/txt); served at /renders/ in dev only. */
export var RENDERS_FIXTURES_DIR = fixturepath('renders');
export var TRAINING_CORPUS_DIR = fixturepath('generated', 'training');
export var COOLREGIONSBOW_BOOK_JSON_PATH = fixturepath('books', 'example-coolregionsbow.book.json');
export var LANG_PARITY_MANIFEST_PATH = fixturepath('lang', 'parity', 'manifest.json');
export var LANG_INTEGRATION_MANIFEST_PATH = fixturepath('lang', 'integration', 'manifest.json');
export var LANG_COOLREGIONSBOW_MANIFEST_PATH = fixturepath('lang', 'coolregionsbow', 'manifest.json');
export var CONTENT_FIXTURES_DIR = fixturepath('content');
export var CONTENT_TEMPLATES_DIR = fixturepath('content', 'templates');
export var CONTENT_DIST_DIR = fixturepath('content', 'dist');
export var ZZT_CORPUS_DIR = fixturepath('zzt', 'corpus');
export var ZZT_CORPUS_EXTRACTED_DIR = fixturepath('zzt', 'corpus', 'extracted');
export var ZZT_CORPUS_ZSS_DIR = fixturepath('zzt', 'corpus', 'zss');
export var ZZT_CORPUS_MANIFEST_PATH = fixturepath('zzt', 'corpus', 'manifest.json');
export var ZZT_CORPUS_ZSS_MANIFEST_PATH = fixturepath('zzt', 'corpus', 'zss', 'manifest.json');
export var ZZT_CORPUS_SCREENSHOTS_DIR = fixturepath('zzt', 'corpus', 'screenshots');
export var ZZT_CORPUS_SCREENSHOTS_MANIFEST_PATH = fixturepath('zzt', 'corpus', 'screenshots', 'manifest.json');
export var CONTENT_MINIMAL_MANIFEST_PATH = fixturepath('content', 'templates', 'minimal', 'manifest.json');
export var CONTENT_DEMO_MANIFEST_PATH = fixturepath('content', 'templates', 'demo', 'manifest.json');
