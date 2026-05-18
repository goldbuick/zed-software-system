/**
 * ZNS: email + OTP login, namespace claim, long-lived token, KV pairs.
 * Public: *.zns.zed.cafe/{key} -> 302 to bytes (hash) or zed join (peer id at /peer).
 */

const ZNS_PEER_KEY = 'peer'
const ZNS_APEX_DEFAULT = 'zns.zed.cafe'
const BYTES_ORIGIN_DEFAULT = 'https://bytes.zed.cafe'
const JOIN_ORIGIN_DEFAULT = 'https://zed.cafe'
const RESERVED_NS = new Set(['www', 'api', 'mail', 'ftp'])

const corsheaders = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

/** bytes short keys: 4 letter + base36 time slice (see net-bytes-worker.js) */
const BYTES_HASH_RE = /^[A-Za-z0-9]{8,96}$/

/** PeerJS ids: permissive safe string */
const PEER_ID_RE = /^[a-zA-Z0-9_-]{4,256}$/

const NS_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
const PATH_KEY_RE = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/

function flatstr(value) {
  return (value ?? '').toString().trim().toLowerCase()
}

function digitrandom() {
  return 1 + Math.round(Math.random() * 8)
}

function gentoken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingstringequal(a, b) {
  if (a.length !== b.length) {
    return false
  }
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

function userstoragekey(email) {
  return `user:${email}`
}

function nsstoragekey(namespace) {
  return `ns:${namespace}`
}

function pairstoragekey(namespace, pathkey) {
  return `pair:${namespace}:${pathkey}`
}

function apexhost(env) {
  return env.ZNS_APEX ?? ZNS_APEX_DEFAULT
}

function bytesorigin(env) {
  const o = env.BYTES_ORIGIN ?? BYTES_ORIGIN_DEFAULT
  return o.replace(/\/+$/, '')
}

function joinorigin(env) {
  const o = env.JOIN_ORIGIN ?? JOIN_ORIGIN_DEFAULT
  return o.replace(/\/+$/, '')
}

function validatenamespace(ns) {
  if (!ns || !NS_RE.test(ns) || RESERVED_NS.has(ns)) {
    return false
  }
  return true
}

function validatepathkey(pathkey) {
  if (!pathkey || pathkey.includes('/') || !PATH_KEY_RE.test(pathkey)) {
    return false
  }
  return true
}

function validatepeerid(value) {
  return typeof value === 'string' && PEER_ID_RE.test(value)
}

function normalizebytesvalue(raw) {
  const s = String(raw ?? '').trim()
  if (!s) {
    return null
  }
  if (/^https:\/\/bytes\.zed\.cafe\//i.test(s)) {
    try {
      const u = new URL(s)
      const seg = u.pathname.replace(/^\//, '').split('/')[0]
      if (BYTES_HASH_RE.test(seg)) {
        return seg
      }
    } catch {
      return null
    }
  }
  if (BYTES_HASH_RE.test(s)) {
    return s
  }
  return null
}

async function sendznscodeemail(apikey, email, code) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apikey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'login@zns.zed.cafe',
      to: email,
      subject: `#zns ${code}`,
      html: `<p>#zns ${code}</p>`,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`resend ${res.status}: ${body}`)
  }
}

function parsenamespace(hostname, env) {
  const apex = apexhost(env)
  if (hostname === apex) {
    return null
  }
  const suffix = `.${apex}`
  if (!hostname.endsWith(suffix)) {
    return null
  }
  const ns = hostname.slice(0, -suffix.length).toLowerCase()
  if (!ns || ns.includes('.')) {
    return null
  }
  return ns
}

function publicpathkey(pathname) {
  const decoded = decodeURIComponent(pathname)
  const trimmed = decoded.replace(/^\/+/, '').split('/')[0] ?? ''
  return trimmed ? trimmed.toLowerCase() : ''
}

async function handlelogin(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const namespace = flatstr(formdata.get('namespace'))
  if (!email || !validatenamespace(namespace)) {
    return new Response(JSON.stringify({ message: 'invalid email or namespace' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const nskey = nsstoragekey(namespace)
  const nsentry = await env.zns.getWithMetadata(nskey)
  if (nsentry.metadata?.email && nsentry.metadata.email !== email) {
    return new Response(
      JSON.stringify({ message: `namespace ${namespace} is in use by another account` }),
      { status: 403, headers: corsheaders },
    )
  }
  const ukey = userstoragekey(email)
  const userentry = await env.zns.getWithMetadata(ukey)
  if (userentry?.metadata?.namespace && userentry.metadata.namespace !== namespace) {
    return new Response(
      JSON.stringify({ message: `incorrect namespace for ${email}` }),
      { status: 403, headers: corsheaders },
    )
  }
  const code = [
    digitrandom(),
    digitrandom(),
    digitrandom(),
    digitrandom(),
    digitrandom(),
    digitrandom(),
  ].join('')
  await env.zns.put(ukey, '', {
    metadata: { namespace, code },
  })
  try {
    await sendznscodeemail(env.RESEND_API_KEY, email, code)
  } catch (err) {
    return new Response(JSON.stringify({ message: String(err?.message ?? err) }), {
      status: 502,
      headers: corsheaders,
    })
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handlecode(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const code = flatstr(formdata.get('code'))
  const ukey = userstoragekey(email)
  const userentry = await env.zns.getWithMetadata(ukey)
  if (!userentry?.metadata?.code) {
    return new Response(
      JSON.stringify({ message: `no pending login for ${email}` }),
      { status: 403, headers: corsheaders },
    )
  }
  if (userentry.metadata.code !== code) {
    return new Response(
      JSON.stringify({ message: `incorrect code for ${email}` }),
      { status: 403, headers: corsheaders },
    )
  }
  const namespace = userentry.metadata.namespace
  if (!validatenamespace(namespace)) {
    return new Response(JSON.stringify({ message: 'invalid namespace on account' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const nskey = nsstoragekey(namespace)
  const nsentry = await env.zns.getWithMetadata(nskey)
  if (nsentry.metadata?.email && nsentry.metadata.email !== email) {
    return new Response(
      JSON.stringify({
        message: `namespace ${namespace} is in use by another account; use #zns restart`,
      }),
      { status: 403, headers: corsheaders },
    )
  }
  await env.zns.put(nskey, '', { metadata: { email } })
  const token = gentoken()
  await env.zns.put(ukey, '', {
    metadata: { namespace, token },
  })
  return new Response(JSON.stringify({ success: true, token }), {
    status: 200,
    headers: corsheaders,
  })
}

async function verifytokenandnamespace(env, email, token) {
  const ukey = userstoragekey(email)
  const userentry = await env.zns.getWithMetadata(ukey)
  const stored = userentry.metadata?.token ?? ''
  if (!stored || !timingstringequal(stored, token)) {
    return { ok: false, message: 'invalid email or token' }
  }
  const namespace = userentry.metadata?.namespace
  if (!namespace || !validatenamespace(namespace)) {
    return { ok: false, message: 'account has no namespace' }
  }
  return { ok: true, namespace }
}

async function handleset(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const token = String(formdata.get('token') ?? '').trim()
  const pathkey = flatstr(formdata.get('key'))
  const rawvalue = formdata.get('value')
  const v = await verifytokenandnamespace(env, email, token)
  if (!v.ok) {
    return new Response(JSON.stringify({ message: v.message }), {
      status: 403,
      headers: corsheaders,
    })
  }
  if (!validatepathkey(pathkey)) {
    return new Response(JSON.stringify({ message: 'invalid key' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const { namespace } = v
  if (pathkey === ZNS_PEER_KEY) {
    if (!validatepeerid(String(rawvalue ?? '').trim())) {
      return new Response(JSON.stringify({ message: 'invalid peer id' }), {
        status: 400,
        headers: corsheaders,
      })
    }
    const peerid = String(rawvalue).trim()
    await env.zns.put(pairstoragekey(namespace, pathkey), peerid, {
      metadata: { kind: 'peer', updatedAt: Date.now() },
    })
  } else {
    const hash = normalizebytesvalue(rawvalue)
    if (!hash) {
      return new Response(JSON.stringify({ message: 'invalid bytes hash' }), {
        status: 400,
        headers: corsheaders,
      })
    }
    await env.zns.put(pairstoragekey(namespace, pathkey), hash, {
      metadata: { kind: 'bytes', updatedAt: Date.now() },
    })
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handlelist(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const token = String(formdata.get('token') ?? '').trim()
  const v = await verifytokenandnamespace(env, email, token)
  if (!v.ok) {
    return new Response(JSON.stringify({ message: v.message }), {
      status: 403,
      headers: corsheaders,
    })
  }
  const { namespace } = v
  const prefix = `pair:${namespace}:`
  const result = await env.zns.list({ prefix })
  const names = result.keys.map((k) => k.name)
  if (!names.length) {
    return new Response(JSON.stringify({ success: true, list: [] }), {
      status: 200,
      headers: corsheaders,
    })
  }
  const rows = await Promise.all(names.map((name) => env.zns.getWithMetadata(name)))
  const list = []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const row = rows[i]
    const shortkey = name.slice(prefix.length)
    list.push({
      key: shortkey,
      value: row?.value ?? '',
      metadata: row?.metadata ?? {},
    })
  }
  return new Response(JSON.stringify({ success: true, list }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handledelete(request, env) {
  const formdata = await request.formData()
  const email = flatstr(formdata.get('email'))
  const token = String(formdata.get('token') ?? '').trim()
  const pathkey = flatstr(formdata.get('key'))
  const v = await verifytokenandnamespace(env, email, token)
  if (!v.ok) {
    return new Response(JSON.stringify({ message: v.message }), {
      status: 403,
      headers: corsheaders,
    })
  }
  if (!validatepathkey(pathkey)) {
    return new Response(JSON.stringify({ message: 'invalid key' }), {
      status: 400,
      headers: corsheaders,
    })
  }
  const { namespace } = v
  await env.zns.delete(pairstoragekey(namespace, pathkey))
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsheaders,
  })
}

async function handletenantread(request, env, namespace) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 })
  }
  const url = new URL(request.url)
  const pathkey = publicpathkey(url.pathname)
  if (!pathkey) {
    return new Response('not found', { status: 404 })
  }
  if (!validatepathkey(pathkey)) {
    return new Response('not found', { status: 404 })
  }
  const pkey = pairstoragekey(namespace, pathkey)
  const row = await env.zns.getWithMetadata(pkey)
  const stored = row?.value
  if (stored == null || stored === '') {
    return new Response('not found', { status: 404 })
  }
  let location
  if (pathkey === ZNS_PEER_KEY) {
    location = `${joinorigin(env)}/join/#${stored}`
  } else {
    location = `${bytesorigin(env)}/${stored}`
  }
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const hostname = url.hostname.toLowerCase()
    const apex = apexhost(env)

    if (hostname === apex) {
      const { pathname } = url
      if (request.method === 'POST') {
        switch (pathname) {
          case '/api/login':
            return handlelogin(request, env)
          case '/api/code':
            return handlecode(request, env)
          case '/api/set':
            return handleset(request, env)
          case '/api/list':
            return handlelist(request, env)
          case '/api/delete':
            return handledelete(request, env)
          default:
            break
        }
      }
      return new Response('not found', { status: 404, headers: corsheaders })
    }

    const namespace = parsenamespace(hostname, env)
    if (namespace && validatenamespace(namespace)) {
      return handletenantread(request, env, namespace)
    }

    return new Response('not found', { status: 404 })
  },
}
