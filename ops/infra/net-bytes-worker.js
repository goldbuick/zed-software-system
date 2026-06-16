/** Short-link service for zed.cafe share URLs. API reference: ops/infra/README.md#bytes-net-bytes-workerjs */

const corsheaders = {
  'Access-Control-Allow-Headers': '*', // What headers are allowed. * is wildcard. Instead of using '*', you can specify a list of specific headers that are allowed, such as: Access-Control-Allow-Headers: X-Requested-With, Content-Type, Accept, Authorization.
  'Access-Control-Allow-Methods': 'GET, POST', // Allowed methods. Others could be PUT, DELETE etc.
  'Access-Control-Allow-Origin': '*', // This is URLs that are allowed to access the server. * is the wildcard character meaning any URL can.
}

function writeredirect(url) {
  return `<!doctype html>
  <html lang=en>
  <head>
  <meta charset=utf-8>
  <title>...adding bytes</title>
  </head>
  <body>
  <script>location = '${url}';</script>
  </body>
</html>`
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    switch (request.method) {
      case 'POST':
        return handleCreateRedirect(request, env)
      case 'DELETE':
        return handleDeleteRedirect(request, env)
      case 'GET':
        switch (pathname) {
          case '/':
            return serveIndexPage(env)
          case '/bytefix':
            return serveListPage(env)
          case '/recent-shares':
            return serveRecentShares(env)
          default:
            break
        }
        break
    }
    const key = pathname.split('/')[1]
    if (!key) {
      return new Response('', { status: 200, headers: corsheaders })
    }
    if (key === 'robots.txt') {
      return new Response('User-agent: *\nDisallow: /', {
        status: 200,
        headers: {
          ...corsheaders,
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      })
    }
    const dest = await env.kv.get(key)
    if (dest) {
      return new Response(writeredirect(dest), {
        status: 200,
        headers: { ...corsheaders, 'Content-Type': 'text/html' },
      })
    }
    return new Response(``, {
      status: 404,
      headers: { ...corsheaders, 'Content-Type': 'text/plain' },
    })
  },
}

async function serveIndexPage(env) {
  return new Response(``, {
    status: 200,
    headers: { ...corsheaders, 'Content-Type': 'text/plain' },
  })
}

async function handleCreateRedirect(request, env) {
  const formData = await request.formData()
  const url = formData.get('url')
  const book = formData.get('book')
  if (
    !url.startsWith('https://zed.cafe/') &&
    !url.startsWith('https://localhost:7777/')
  ) {
    return new Response('unauthorized', { status: 401, headers: corsheaders })
  }
  // Generate a unique path
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(36)
    .slice(-4)
  const randomString = generateRandomString(4)
  let path = `${randomString}${timestamp}`
  // test it
  const existingUrl = await env.kv.get(path)
  if (existingUrl) {
    return new Response('try again', { status: 200, headers: corsheaders })
  }
  await env.kv.put(path, url, {
    metadata: {
      book,
      created: Date.now(),
      isjoin: url.toLowerCase().includes('join'),
    },
  })
  return new Response(`${new URL(request.url).origin}/${path}`, {
    status: 200,
    headers: corsheaders,
  })
}

function generateRandomString(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

async function handleDeleteRedirect(request, env) {
  const formData = await request.formData()
  const path = formData.get('path')
  if (!path) {
    return new Response('invalid request', {
      status: 400,
      headers: corsheaders,
    })
  }
  const existingUrl = await env.kv.get(path)
  if (!existingUrl) {
    return new Response('redirect not found', {
      status: 404,
      headers: corsheaders,
    })
  }
  await env.kv.delete(path)
  return new Response('redirect deleted successfully', {
    status: 200,
    headers: corsheaders,
  })
}

async function serveListPage(env) {
  const listResult = await env.kv.list()
  const keys = await Promise.all(
    listResult.keys.map(async ({ name, metadata }) => ({
      name,
      metadata,
      value: await env.kv.get(name),
    })),
  )
  return new Response(JSON.stringify(keys), {
    headers: { 'Content-Type': 'text/plain' },
  })
}

async function serveRecentShares(env) {
  const listResult = await env.kv.list()
  const shares = listResult.keys
    .filter(
      ({ metadata }) =>
        !(metadata && metadata.isjoin) && metadata && metadata.created,
    )
    .sort((a, b) => {
      const acreated = a.metadata ? a.metadata.created || 0 : 0
      const bcreated = b.metadata ? b.metadata.created || 0 : 0
      return bcreated - acreated
    })
    .slice(0, 5)
    .map(({ name, metadata }) => ({
      book: metadata?.book ?? name,
      bytes: name,
    }))
  return new Response(JSON.stringify({ success: true, shares }), {
    status: 200,
    headers: { ...corsheaders, 'Content-Type': 'application/json' },
  })
}
