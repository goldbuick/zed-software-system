import fs from 'node:fs';
import path from 'node:path';
var MIMES = {
    '.html': 'text/html; charset=utf-8',
    '.wav': 'audio/wav',
    '.json': 'application/json',
    '.txt': 'text/plain; charset=utf-8',
};
/** Lets same-origin parity host load in iframes under the app COEP require-corp. */
var COEP_IFRAME_HTML_HEADERS = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
};
var PARITY_BLANK_HOST_PATH = '/parity-host';
var PARITY_BLANK_HOST_HTML = '<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>';
function applycoepiframehtmlheaders(res, filepath) {
    if (path.extname(filepath).toLowerCase() !== '.html') {
        return;
    }
    for (var _i = 0, _a = Object.entries(COEP_IFRAME_HTML_HEADERS); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        res.setHeader(key, value);
    }
}
function contenttype(filepath) {
    return MIMES[path.extname(filepath).toLowerCase()];
}
/** Serve files under rootdir at /{prefix}/… (dev + parity Playwright only). */
export function fixtureprefixmiddleware(prefix, rootdir) {
    var prefixwithslash = prefix.endsWith('/') ? prefix : "".concat(prefix, "/");
    return function (req, res, next) {
        var _a;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            next();
            return;
        }
        var pathname = ((_a = req.url) !== null && _a !== void 0 ? _a : '').split('?')[0];
        if (!pathname.startsWith(prefixwithslash)) {
            next();
            return;
        }
        var rel = pathname.slice(prefixwithslash.length);
        if (!rel || rel.includes('..')) {
            next();
            return;
        }
        var file = path.join(rootdir, rel);
        var resolved = path.resolve(file);
        if (!resolved.startsWith(path.resolve(rootdir)) ||
            !fs.existsSync(resolved)) {
            next();
            return;
        }
        var stat = fs.statSync(resolved);
        if (!stat.isFile()) {
            next();
            return;
        }
        var type = contenttype(resolved);
        if (type) {
            res.setHeader('Content-Type', type);
        }
        applycoepiframehtmlheaders(res, resolved);
        if (req.method === 'HEAD') {
            res.statusCode = 200;
            res.end();
            return;
        }
        fs.createReadStream(resolved).pipe(res);
    };
}
/** Inline blank COEP host for Playwright page.evaluate (no committed HTML file). */
export function parityblankhostmiddleware() {
    return function (req, res, next) {
        var _a;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            next();
            return;
        }
        var pathname = ((_a = req.url) !== null && _a !== void 0 ? _a : '').split('?')[0];
        if (pathname !== PARITY_BLANK_HOST_PATH) {
            next();
            return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        for (var _i = 0, _b = Object.entries(COEP_IFRAME_HTML_HEADERS); _i < _b.length; _i++) {
            var _c = _b[_i], key = _c[0], value = _c[1];
            res.setHeader(key, value);
        }
        if (req.method === 'HEAD') {
            res.statusCode = 200;
            res.end();
            return;
        }
        res.statusCode = 200;
        res.end(PARITY_BLANK_HOST_HTML);
    };
}
