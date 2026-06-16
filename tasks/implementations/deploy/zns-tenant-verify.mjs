/**
 * Production checks for ZNS tenant hosts (*.at.zed.cafe).
 * Usage: node zns-tenant-verify.mjs [--dns-only]
 */
import { execFileSync } from 'node:child_process'

const DIG_TIMEOUT_MS = 15_000
const CURL_TIMEOUT_S = 30

const TENANT_HOSTS = ['docs.at.zed.cafe', 'wil.at.zed.cafe']
const WRONG_HOST = 'docs.zed.cafe'
const ZNS_APEX_URL = 'https://zns.zed.cafe/'
const TENANT_INDEX_URL = 'https://docs.at.zed.cafe/'

const dnsonly = process.argv.includes('--dns-only')

function digshort(host, type = 'AAAA') {
  return execFileSync('dig', ['+short', host, type], {
    encoding: 'utf8',
    timeout: DIG_TIMEOUT_MS,
  }).trim()
}

function fail(layer, message) {
  console.error(`zns tenant verify [${layer}]: ${message}`)
  process.exit(1)
}

function pass(message) {
  console.log(`ok: ${message}`)
}

function checktenantdns() {
  for (const host of TENANT_HOSTS) {
    const records = digshort(host)
    if (!records) {
      fail(
        'dns',
        `${host} has no AAAA records — add proxied AAAA *.at → 100:: in zed.cafe zone (see ops/infra/README.md)`,
      )
    }
    const first = records.split('\n').find((line) => line.length > 0) ?? records
    pass(`${host} resolves (${first})`)
  }
}

function checkwronghost() {
  const records = digshort(WRONG_HOST)
  if (records) {
    fail(
      'dns',
      `${WRONG_HOST} resolves — tenant URLs must use docs.at.zed.cafe, not docs.zed.cafe; remove or repoint ${WRONG_HOST}`,
    )
  }
  pass(`${WRONG_HOST} does not resolve (correct)`)
}

function curlstatus(url) {
  return execFileSync(
    'curl',
    [
      '-fsS',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      '--max-time',
      String(CURL_TIMEOUT_S),
      url,
    ],
    {
      encoding: 'utf8',
      timeout: (CURL_TIMEOUT_S + 5) * 1000,
    },
  ).trim()
}

function curlcontenttype(url) {
  const headers = execFileSync(
    'curl',
    ['-fsS', '-I', '--max-time', String(CURL_TIMEOUT_S), url],
    {
      encoding: 'utf8',
      timeout: (CURL_TIMEOUT_S + 5) * 1000,
    },
  )
  const line = headers
    .split('\n')
    .find((row) => row.toLowerCase().startsWith('content-type:'))
  return line ? line.slice('content-type:'.length).trim() : ''
}

function checkhttps(url, label, expecthtml = false) {
  let status = ''
  try {
    status = curlstatus(url)
  } catch (err) {
    const hint =
      err?.message?.includes('Could not resolve host')
        ? ' — DNS not configured'
        : err?.message?.includes('SSL') || err?.message?.includes('certificate')
          ? ' — TLS for *.at.zed.cafe may be missing (Total TLS or ACM)'
          : ''
    fail('https', `${label} ${url} request failed${hint}`)
  }
  if (status !== '200') {
    fail('https', `${label} ${url} returned HTTP ${status}, expected 200`)
  }
  if (expecthtml) {
    const contenttype = curlcontenttype(url)
    if (!contenttype.includes('text/html')) {
      fail(
        'https',
        `${label} ${url} Content-Type is "${contenttype}", expected text/html`,
      )
    }
  }
  pass(`${label} ${url} HTTP 200`)
}

function checkhttpssuite() {
  checkhttps(ZNS_APEX_URL, 'apex', false)
  checkhttps(TENANT_INDEX_URL, 'tenant index', true)
}

console.log('zns tenant verify: production checks')
checktenantdns()
checkwronghost()
if (!dnsonly) {
  checkhttpssuite()
}
console.log('zns tenant verify: all checks passed')
