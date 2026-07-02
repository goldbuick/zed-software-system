import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { inflateSync } from 'node:zlib'

import { requiretaskenv, spawntask, taskenv } from 'tasks/shellutil'

import { def, exec, handler, shell, tasksonly } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

function runvmzssdocker(ctx: TaskContext): number {
  const e = taskenv(ctx)
  const image = e.ZSS_IMAGE ?? 'ellium12/zed-software-system:latest'
  const vol = e.ZSS_DATA_VOLUME ?? 'zss-data'
  const port = e.ZSS_PORT ?? '4175'
  const runlocal = e.VM_RUN_LOCAL === '1'

  const rundocker = () => {
    spawntask('docker', ['pull', image], ctx, { inherit: true })
    spawnSync('docker', ['rm', '-f', 'zss'], { stdio: 'ignore' })
    return spawntask(
      'docker',
      [
        'run',
        '-d',
        '--name',
        'zss',
        '--restart',
        'unless-stopped',
        '--network',
        'host',
        '-v',
        `${vol}:/data`,
        '-e',
        `ZSS_SERVER_PORT=${port}`,
        '-e',
        'ZSS_DATA_DIR=/data',
        image,
      ],
      ctx,
      { inherit: true },
    )
  }

  if (runlocal) {
    console.log('Running ZSS container locally (VM_RUN_LOCAL=1)...')
    return rundocker()
  }

  const host = e.VM_SSH_HOST ?? ''
  if (!host) {
    console.error(
      'Set VM_RUN_LOCAL=1 on the VM, or set VM_SSH_HOST (and optional VM_SSH_USER, VM_SSH_IDENTITYFILE) to run over SSH.',
    )
    return 1
  }

  const user = e.VM_SSH_USER ?? 'ubuntu'
  const ident = e.VM_SSH_IDENTITYFILE ?? ''
  const remote = `docker pull ${image} && docker rm -f zss 2>/dev/null || true; docker run -d --name zss --restart unless-stopped --network host -v ${vol}:/data -e ZSS_SERVER_PORT=${port} -e ZSS_DATA_DIR=/data ${image}`
  const sshargs = ident
    ? [
        '-i',
        ident,
        '-o',
        'StrictHostKeyChecking=accept-new',
        `${user}@${host}`,
        remote,
      ]
    : ['-o', 'StrictHostKeyChecking=accept-new', `${user}@${host}`, remote]
  console.log(`Running on ${user}@${host} via SSH...`)
  return spawntask('ssh', sshargs, ctx, { inherit: true })
}

function runawsec2docker(ctx: TaskContext): number {
  const e = taskenv(ctx)
  const merged: NodeJS.ProcessEnv = {
    ...e,
    VM_SSH_HOST: e.AWS_EC2_HOST ?? e.VM_SSH_HOST ?? '',
    VM_SSH_USER: e.AWS_EC2_USER ?? e.VM_SSH_USER ?? 'ubuntu',
    VM_SSH_IDENTITYFILE: e.AWS_EC2_SSH_KEY ?? e.VM_SSH_IDENTITYFILE ?? '',
    VM_RUN_LOCAL: e.AWS_RUN_LOCAL ?? e.VM_RUN_LOCAL ?? '0',
  }
  return runvmzssdocker({ ...ctx, env: merged })
}

function rundigitaloceandocker(ctx: TaskContext): number {
  const e = taskenv(ctx)
  const merged: NodeJS.ProcessEnv = {
    ...e,
    VM_SSH_HOST: e.DO_DROPLET_HOST ?? e.VM_SSH_HOST ?? '',
    VM_SSH_USER: e.DO_DROPLET_USER ?? e.VM_SSH_USER ?? 'root',
    VM_SSH_IDENTITYFILE: e.DO_DROPLET_SSH_KEY ?? e.VM_SSH_IDENTITYFILE ?? '',
    VM_RUN_LOCAL: e.DO_RUN_LOCAL ?? e.VM_RUN_LOCAL ?? '0',
  }
  return runvmzssdocker({ ...ctx, env: merged })
}

function rundockerrunhelp(): number {
  console.log(
    'deploy:docker:run — published image (ellium12/zed-software-system)',
  )
  console.log('')
  console.log('This runs the equivalent of:')
  console.log('')
  console.log(
    '  docker run -it --network host --name zss -v zss-data:/data ellium12/zed-software-system ./start.sh',
  )
  console.log('')
  console.log('  -it                 Interactive TTY')
  console.log('  --network host      Container uses the host network stack')
  console.log(
    '  --name zss          Fixed container name (if it already exists: docker rm -f zss)',
  )
  console.log(
    '  -v zss-data:/data   Named volume for ZSS data (ZSS_DATA_DIR in the image)',
  )
  console.log('')
  return 0
}

function wofftotf(woff: Buffer): Buffer {
  const sig = woff.toString('ascii', 0, 4)
  if (sig !== 'wOFF') {
    throw new Error('IBMEGA8x14.woff is not a WOFF file')
  }
  const numtables = woff.readUInt16BE(12)
  let offset = 44
  const tables: { tag: string; data: Buffer }[] = []
  for (let t = 0; t < numtables; t++) {
    const tag = woff.toString('ascii', offset, offset + 4)
    const tableoffset = woff.readUInt32BE(offset + 4)
    const complength = woff.readUInt32BE(offset + 8)
    const origlength = woff.readUInt32BE(offset + 12)
    const comp = woff.subarray(tableoffset, tableoffset + complength)
    const data = complength === origlength ? comp : inflateSync(comp)
    tables.push({ tag, data })
    offset += 20
  }
  const headersize = 12 + tables.length * 16
  let pos = headersize
  const records = tables.map((table) => {
    const rec = { tag: table.tag, pos, length: table.data.length }
    pos += (table.data.length + 3) & ~3
    return rec
  })
  const out = Buffer.alloc(pos)
  out.writeUInt32BE(0x00010000, 0)
  out.writeUInt16BE(tables.length, 4)
  const searchrange = 2 ** Math.floor(Math.log2(tables.length)) * 16
  out.writeUInt16BE(searchrange, 6)
  out.writeUInt16BE(Math.log2(searchrange / 16), 8)
  out.writeUInt16BE(tables.length * 16 - searchrange, 10)
  let recoff = 12
  for (const rec of records) {
    out.write(rec.tag, recoff)
    out.writeUInt32BE(0, recoff + 4)
    out.writeUInt32BE(rec.pos, recoff + 8)
    out.writeUInt32BE(rec.length, recoff + 12)
    recoff += 16
  }
  let dataoff = headersize
  for (const table of tables) {
    table.data.copy(out, dataoff)
    dataoff += (table.data.length + 3) & ~3
  }
  return out
}

function runznsvgasync(ctx: TaskContext): number {
  const root = ctx.root
  const fontdir = join(root, 'ops/infra/zns-public/fonts')
  const woffsource = join(fontdir, 'IBMEGA8x14.woff')
  const ttfdest = join(fontdir, 'IBMEGA8x14.ttf')
  const fontdest = join(root, 'ops/infra/generated/zns-vga-font.js')
  mkdirSync(dirname(fontdest), { recursive: true })
  const woffbytes = readFileSync(woffsource)
  writeFileSync(ttfdest, wofftotf(woffbytes))
  const fontb64 = woffbytes.toString('base64')
  const ttfb64 = readFileSync(ttfdest).toString('base64')
  writeFileSync(
    fontdest,
    `/** Generated by zns:vga:sync — do not edit. */
export const ZNS_VGA_FONT_DATA_URI = 'data:font/woff;base64,${fontb64}'
export const ZNS_VGA_FONT_TTF_BASE64 = '${ttfb64}'
`,
  )
  console.log('wrote ops/infra/generated/zns-vga-font.js')
  return 0
}

const DIG_TIMEOUT_MS = 15_000
const CURL_TIMEOUT_S = 30
const TENANT_HOSTS = ['docs.at.zed.cafe', 'wil.at.zed.cafe']
const WRONG_HOST = 'docs.zed.cafe'
const ZNS_APEX_URL = 'https://at.zed.cafe/'
const TENANT_INDEX_URL = 'https://docs.at.zed.cafe/'

function digshort(host: string, type = 'AAAA'): string {
  return execFileSync('dig', ['+short', host, type], {
    encoding: 'utf8',
    timeout: DIG_TIMEOUT_MS,
  }).trim()
}

function curlstatus(url: string): string {
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

function curlcontenttype(url: string): string {
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

function runznstenantverify(ctx: TaskContext): number {
  const dnsonly = ctx.args.includes('--dns-only')

  const fail = (layer: string, message: string) => {
    console.error(`zns tenant verify [${layer}]: ${message}`)
    return 1
  }

  const pass = (message: string) => {
    console.log(`ok: ${message}`)
  }

  console.log('zns tenant verify: production checks')

  for (const host of TENANT_HOSTS) {
    const records = digshort(host)
    if (!records) {
      return fail(
        'dns',
        `${host} has no AAAA records — add proxied AAAA *.at → 100:: in zed.cafe zone (see ops/infra/README.md)`,
      )
    }
    const first = records.split('\n').find((line) => line.length > 0) ?? records
    pass(`${host} resolves (${first})`)
  }

  const wrongrecords = digshort(WRONG_HOST)
  if (wrongrecords) {
    return fail(
      'dns',
      `${WRONG_HOST} resolves — tenant URLs must use docs.at.zed.cafe, not docs.zed.cafe; remove or repoint ${WRONG_HOST}`,
    )
  }
  pass(`${WRONG_HOST} does not resolve (correct)`)

  if (!dnsonly) {
    for (const [url, label, expecthtml] of [
      [ZNS_APEX_URL, 'apex', false],
      [TENANT_INDEX_URL, 'tenant index', true],
    ] as const) {
      let status = ''
      try {
        status = curlstatus(url)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const hint = message.includes('Could not resolve host')
          ? ' — DNS not configured'
          : message.includes('SSL') || message.includes('certificate')
            ? ' — TLS for *.at.zed.cafe may be missing (Total TLS or ACM)'
            : ''
        return fail('https', `${label} ${url} request failed${hint}`)
      }
      if (status !== '200') {
        return fail(
          'https',
          `${label} ${url} returned HTTP ${status}, expected 200`,
        )
      }
      if (expecthtml) {
        const contenttype = curlcontenttype(url)
        if (!contenttype.includes('text/html')) {
          return fail(
            'https',
            `${label} ${url} Content-Type is "${contenttype}", expected text/html`,
          )
        }
      }
      pass(`${label} ${url} HTTP 200`)
    }
  }

  console.log('zns tenant verify: all checks passed')
  return 0
}

async function runznsemailpreview(ctx: TaskContext): Promise<number> {
  const root = ctx.root
  const outdir = join(root, 'ops/infra/generated')
  const code = '363412'
  const email = 'whitlark@gmail.com'
  const namespace = 'docs'
  const joinorigin = 'https://zed.cafe'
  const LEGACY_BAD = [
    '#153f15',
    '#3f3f3f',
    '#00002a',
    '#2a2a2a',
    '#15153f',
    '#3f3f15',
  ]

  const [
    { ZNS_DOT_BG },
    { buildznscodemeta, buildznscodeemailhtml, buildznsemailpalette },
    { buildznsemailcardpreviewhtml, buildznsemailcardsvg },
    { initemailcardwasm, reademailcardfontbytes, renderemailcardpngwasmcore },
    { ZNS_VGA_FONT_DATA_URI },
  ] = await Promise.all([
    import('../../ops/infra/zns-dotbkg.js'),
    import('../../ops/infra/zns-email-card.js'),
    import('../../ops/infra/zns-email-card-svg.js'),
    import('../../ops/infra/zns-email-card-png-wasm-core.js'),
    import('../../ops/infra/generated/zns-vga-font.js'),
  ])

  const assertok = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`assert failed: ${message}`)
      throw new Error(message)
    }
  }

  mkdirSync(outdir, { recursive: true })
  const meta = buildznscodemeta({ code, email, namespace, joinorigin })
  const svg = buildznsemailcardsvg(
    {
      namespace: meta.namespace,
      command: meta.command,
      deeplink: meta.deeplink,
    },
    ZNS_VGA_FONT_DATA_URI,
  )
  const svglc = svg.toLowerCase()
  assertok(
    svglc.includes('fill="#55ff55"'),
    'command row must use bright green #55FF55',
  )
  assertok(!svglc.includes('#153f15'), 'must not use legacy dark green #153f15')
  assertok(
    !svglc.includes('╔'),
    'email card must use single-line CP437 frame like at.zed.cafe',
  )
  assertok(svglc.includes('openit'), 'email card must include OPENIT row')
  assertok(
    svglc.includes('fill="#ff55ff"'),
    'OPENIT arrow must use purple #FF55FF',
  )
  assertok(
    svglc.includes('fill="#ffff55"'),
    'OPENIT label must use yellow #FFFF55',
  )
  for (const bad of LEGACY_BAD) {
    assertok(!svglc.includes(bad), `SVG must not contain legacy token ${bad}`)
  }
  assertok(
    svglc.includes(ZNS_DOT_BG.toLowerCase()),
    `SVG background must use ${ZNS_DOT_BG}`,
  )
  assertok(
    svglc.includes('cx="9" cy="15"'),
    'email dot pattern must use checkerboard tile',
  )
  assertok(
    svglc.includes('fill="#55ffff"'),
    'frame/links must use bright cyan #55FFFF',
  )
  assertok(svglc.includes('fill="#ffffff"'), 'body text must use white #FFFFFF')

  const wasmpath = join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')
  await initemailcardwasm(readFileSync(wasmpath))
  const pngbytes = await renderemailcardpngwasmcore(
    svg,
    reademailcardfontbytes(),
  )
  const pngpath = join(outdir, 'zns-email-preview.png')
  const htmlpath = join(outdir, 'zns-email-preview.html')
  const productionhtml = buildznscodeemailhtml({
    subject: meta.subject,
    preheader: meta.preheader,
    deeplink: meta.deeplink,
    command: meta.command,
  })
  const previewhtml = buildznsemailcardpreviewhtml(meta, ZNS_VGA_FONT_DATA_URI)
  const emailpalette = buildznsemailpalette()
  assertok(
    productionhtml
      .toLowerCase()
      .includes(`background:${emailpalette.dkblue.toLowerCase()}`),
    'production email button must use dot background blue',
  )
  assertok(
    productionhtml
      .toLowerCase()
      .includes(`color:${emailpalette.white.toLowerCase()}`),
    'production email button must use white text',
  )
  writeFileSync(pngpath, pngbytes)
  writeFileSync(
    htmlpath,
    `${previewhtml}
<!-- production email HTML (Resend body) -->
<hr>
<h2>Production HTML</h2>
${productionhtml}`,
  )
  console.log(`wrote ${pngpath}`)
  console.log(`wrote ${htmlpath}`)
  console.log(`open: file://${htmlpath}`)
  return 0
}

async function runznsgridpreview(ctx: TaskContext): Promise<number> {
  const root = ctx.root
  const fixturedir = join(root, 'ops/fixtures/zns')
  const dest = join(root, 'ops/infra/generated/zns-grid-preview.html')
  const readfixture = (name: string) =>
    readFileSync(join(fixturedir, name), 'utf8').replace(/\r\n/g, '\n')
  const [{ validatecp437webchars }, { buildznsgridpreviewhtml }] =
    await Promise.all([
      import('../../ops/infra/zns-cp437.js'),
      import('../../ops/infra/zns-grid-preview.js'),
    ])
  const problems = validatecp437webchars()
  if (problems.length !== 0) {
    console.error(
      `assert failed: cp437 web chars invalid: ${JSON.stringify(problems.slice(0, 3))}`,
    )
    return 1
  }
  mkdirSync(dirname(dest), { recursive: true })
  const html = buildznsgridpreviewhtml({
    calibrationtape: readfixture('grid-calibration.txt'),
    fidelitytape: readfixture('fidelity-sample.txt'),
  })
  writeFileSync(dest, html)
  console.log(`wrote ${dest}`)
  console.log(`open: file://${dest}`)
  return 0
}

async function runznsscrollpreview(ctx: TaskContext): Promise<number> {
  const root = ctx.root
  const romdir = join(root, 'zss/rom/refscroll')
  const dest = join(root, 'ops/infra/generated/zns-scroll-preview.html')
  const {
    scrollsourceisrawzss,
    scrollsourceisscrollcodepage,
    zedscrollhtml,
    zedtapehtml,
    zedtaperowshtml,
    zedzsshtml,
    zsssectionlines,
  } = await import('../../ops/infra/zns-zedhtml.js')
  const { validatecp437webchars } = await import('../../ops/infra/zns-cp437.js')
  const readfixture = (name: string) =>
    readFileSync(join(romdir, name), 'utf8').replace(/\r\n/g, '\n')
  const assertok = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`assert failed: ${message}`)
      throw new Error(message)
    }
  }
  const cliscroll = readfixture('cliscroll.md')
  const helptext = readfixture('helptext.md')
  const algoscroll = readfixture('algoscroll.md')
  const passage = readFileSync(
    join(root, 'ops/fixtures/lang/coolregionsbow/passage.zss'),
    'utf8',
  ).replace(/\r\n/g, '\n')
  const clhtml = zedtapehtml(cliscroll, { tenantbase: '/' })
  const helhtml = zedtapehtml(helptext, { tenantbase: '/' })
  const algohtml = zedtapehtml(algoscroll, { tenantbase: '/' })
  const passagehtml = zedzsshtml(passage, { tenantbase: '/' })
  const clwithtitle = `@cliscroll\n${cliscroll}`
  assertok(
    !scrollsourceisrawzss(clwithtitle),
    'cliscroll with @ title is markdown not raw ZSS',
  )
  assertok(
    !scrollsourceisrawzss(cliscroll),
    'cliscroll is markdown not raw ZSS',
  )
  assertok(!scrollsourceisrawzss(helptext), 'helptext is markdown not raw ZSS')
  assertok(scrollsourceisrawzss(passage), 'passage is raw ZSS')
  assertok(
    validatecp437webchars().length === 0,
    'all cp437 0-255 must be web-safe',
  )
  const scrollcodepage = '@scroll notes\n## heading\n$RED hi'
  assertok(
    scrollsourceisscrollcodepage(scrollcodepage),
    'scroll codepage detected',
  )
  assertok(
    !scrollsourceisrawzss(scrollcodepage),
    'scroll codepage is not raw ZSS',
  )
  const scrollhtml = zedscrollhtml(scrollcodepage, { tenantbase: '/' })
  assertok(
    !scrollhtml.includes('@scroll notes'),
    'scroll header stripped from html',
  )
  assertok(
    !scrollhtml.includes('## heading'),
    'scroll heading rendered via markdown',
  )
  assertok(scrollhtml.includes('heading'), 'scroll heading text present')
  assertok(!scrollhtml.includes('$RED'), 'scroll $RED should not show literal')
  assertok(
    scrollhtml.toLowerCase().includes('color:#') &&
      !scrollhtml.includes('$RED'),
    'scroll $RED should render as colored span',
  )
  assertok(clhtml.includes('OPENIT'), 'cliscroll should render OPENIT rows')
  assertok(
    !clhtml.includes('[ZTK'),
    'cliscroll should not contain raw markdown links',
  )
  assertok(
    !clhtml.includes('$onblue'),
    'cliscroll should not show literal $onblue',
  )
  assertok(
    !clhtml.includes('$blwhite'),
    'cliscroll should not show literal $blwhite',
  )
  assertok(
    clhtml.includes('═') ||
      clhtml.includes('&#9552;') ||
      !clhtml.includes('$205'),
    'cliscroll should render box drawing from $205',
  )
  const hcolors = new Set(
    [...helhtml.matchAll(/color:#[0-9a-fA-F]+/gi)].map((m) => m[0]),
  )
  assertok(hcolors.size >= 3, 'helptext should have multiple syntax colors')
  assertok(!helhtml.includes('$RED'), 'helptext should not show literal $RED')
  assertok(
    helhtml.includes('foreground color'),
    'helptext fixture content present',
  )
  const passagecolors = new Set(
    [...passagehtml.matchAll(/color:#[0-9a-fA-F]+/gi)].map((m) => m[0]),
  )
  assertok(passagecolors.size >= 3, 'passage should have ZSS syntax colors')
  assertok(passagehtml.includes('@passage'), 'passage content present')
  assertok(
    passagehtml.includes('color:#aa00aa'),
    'passage @ stats should be dkpurple',
  )
  const indexrows = [
    ...zsssectionlines('bytes'),
    '$purple$16 $yellowOPENIT $whitecoolregionsbow ',
  ].join('\n')
  const indexhtml = `<div class="zns-tape">${zedtaperowshtml(indexrows)}</div>`
  assertok(
    !indexhtml.includes('$dkpurple'),
    'section bar should render not leak tokens',
  )
  assertok(!/>\s*\|/.exec(indexhtml), 'OPENIT rows should not have pipe prefix')
  assertok(indexhtml.includes('OPENIT'), 'index-style OPENIT row present')
  assertok(
    !indexhtml.includes('\u0010'),
    'OPENIT marker must not be Unicode control U+0010',
  )
  assertok(
    indexhtml.includes('\u25ba') ||
      indexhtml.includes('&#9658;') ||
      indexhtml.includes('\u25b6') ||
      indexhtml.includes('&#9654;'),
    'OPENIT row should render $16 as U+25BA in IBM font',
  )
  assertok(
    !indexhtml.includes('\uF010') && !indexhtml.includes('&#61456;'),
    'OPENIT marker must not use PUA U+F010',
  )
  assertok(
    clhtml.includes('color:#ffffff') || clhtml.includes('color:#FFFFFF'),
    'cliscroll OPENIT label should use white',
  )
  assertok(
    algohtml.includes('--&gt; = signal flow') ||
      algohtml.includes('--> = signal flow'),
    'algoscroll legend content present',
  )
  assertok(algohtml.includes('algo0'), 'algoscroll algo0 heading present')
  assertok(algohtml.includes('synthscroll'), 'algoscroll back link present')
  assertok(
    /--&gt; = signal flow[\s\S]*<div class="zns-line"><\/div>[\s\S]*algo0/.test(
      algohtml,
    ) ||
      /--> = signal flow[\s\S]*<div class="zns-line"><\/div>[\s\S]*algo0/.test(
        algohtml,
      ),
    'algoscroll should preserve blank row between legend and algo0 sections',
  )
  mkdirSync(dirname(dest), { recursive: true })
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ZNS scroll preview</title>
<style>
body { margin: 16px; background: #0000AA; color: #fff; font-family: monospace; }
section { margin-bottom: 32px; }
</style>
</head>
<body>
<section><h1>cliscroll</h1>${clhtml}</section>
<section><h1>helptext</h1>${helhtml}</section>
<section><h1>algoscroll</h1>${algohtml}</section>
<section><h1>passage</h1>${passagehtml}</section>
<section><h1>scroll codepage</h1>${scrollhtml}</section>
</body>
</html>`
  writeFileSync(dest, html)
  console.log(`wrote ${dest}`)
  console.log(`open: file://${dest}`)
  return 0
}

function rungcpvmcreate(ctx: TaskContext): number {
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const e = taskenv(ctx)
  const zone = e.GCP_ZONE ?? 'us-west1-a'
  const name = e.GCP_VM_NAME ?? 'zss-vm'
  const tag = e.GCP_VM_TAG ?? 'zss-server'
  spawntask('gcloud', ['config', 'set', 'project', project], ctx, {
    inherit: true,
  })
  const code = spawntask(
    'gcloud',
    [
      'compute',
      'instances',
      'create',
      name,
      `--zone=${zone}`,
      '--machine-type=e2-micro',
      `--tags=${tag}`,
      '--image-family=ubuntu-2204-lts',
      '--image-project=ubuntu-os-cloud',
    ],
    ctx,
    { inherit: true },
  )
  if (code === 0) {
    console.log(
      `Instance ${name} created. Install Docker on the VM, then run deploy:gcp-vm:docker-run.`,
    )
  }
  return code
}

function rungcpvmfirewall(ctx: TaskContext): number {
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const e = taskenv(ctx)
  const rule = e.GCP_FW_RULE ?? 'allow-zss-4175'
  const tag = e.GCP_VM_TAG ?? 'zss-server'
  const port = e.GCP_APP_PORT ?? '4175'
  spawntask('gcloud', ['config', 'set', 'project', project], ctx, {
    inherit: true,
  })
  const describe = spawnSync(
    'gcloud',
    ['compute', 'firewall-rules', 'describe', rule],
    { stdio: 'ignore' },
  )
  if (describe.status === 0) {
    console.log(`Firewall rule ${rule} already exists.`)
    return 0
  }
  const code = spawntask(
    'gcloud',
    [
      'compute',
      'firewall-rules',
      'create',
      rule,
      `--allow=tcp:${port}`,
      `--target-tags=${tag}`,
    ],
    ctx,
    { inherit: true },
  )
  if (code === 0) {
    console.log(`Created ${rule} (tcp:${port} for instances tagged ${tag}).`)
  }
  return code
}

function rungcpartifactrepo(ctx: TaskContext): number {
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const e = taskenv(ctx)
  const region = e.GCP_REGION ?? 'us-central1'
  const repo = e.AR_REPO ?? 'zss-repo'
  const registryhost = `${region}-docker.pkg.dev`
  spawntask('gcloud', ['config', 'set', 'project', project], ctx, {
    inherit: true,
  })
  const describe = spawnSync(
    'gcloud',
    ['artifacts', 'repositories', 'describe', repo, `--location=${region}`],
    { stdio: 'ignore' },
  )
  if (describe.status !== 0) {
    spawntask(
      'gcloud',
      [
        'artifacts',
        'repositories',
        'create',
        repo,
        '--repository-format=docker',
        `--location=${region}`,
        '--description=ZSS images',
      ],
      ctx,
      { inherit: true },
    )
  } else {
    console.log(`Repository ${repo} already exists in ${region}.`)
  }
  spawntask(
    'gcloud',
    ['auth', 'configure-docker', registryhost, '--quiet'],
    ctx,
    { inherit: true },
  )
  console.log(`Docker can push to ${registryhost}/${project}/${repo}`)
  return 0
}

function rungcpenableapis(ctx: TaskContext): number {
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const e = taskenv(ctx)
  spawntask('gcloud', ['config', 'set', 'project', project], ctx, {
    inherit: true,
  })
  spawntask(
    'gcloud',
    [
      'services',
      'enable',
      'run.googleapis.com',
      'artifactregistry.googleapis.com',
    ],
    ctx,
    { inherit: true },
  )
  if (e.GCP_ENABLE_COMPUTE === '1') {
    spawntask('gcloud', ['services', 'enable', 'compute.googleapis.com'], ctx, {
      inherit: true,
    })
  }
  console.log(
    `Enabled APIs for project ${project} (Compute: ${e.GCP_ENABLE_COMPUTE ?? '0'}).`,
  )
  return 0
}

function rungcppush(ctx: TaskContext): number {
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const e = taskenv(ctx)
  const region = e.GCP_REGION ?? 'us-central1'
  const repo = e.AR_REPO ?? 'zss-repo'
  const tag = e.GCP_IMAGE_TAG ?? 'latest'
  const imagelocal = e.GCP_IMAGE_LOCAL ?? 'zss:local'
  const registry = `${region}-docker.pkg.dev/${project}/${repo}/zss:${tag}`
  const inspect = spawnSync('docker', ['image', 'inspect', imagelocal], {
    stdio: 'ignore',
  })
  if (inspect.status !== 0) {
    console.error(
      `Local image ${imagelocal} not found. Run: yarn deploy:docker:build`,
    )
    return 1
  }
  spawntask('docker', ['tag', imagelocal, registry], ctx, { inherit: true })
  const code = spawntask('docker', ['push', registry], ctx, { inherit: true })
  if (code === 0) {
    console.log(`Pushed ${registry}`)
  }
  return code
}

function rungcpdeploycloudrun(ctx: TaskContext): number {
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const e = taskenv(ctx)
  const region = e.GCP_REGION ?? 'us-central1'
  const repo = e.AR_REPO ?? 'zss-repo'
  const tag = e.GCP_IMAGE_TAG ?? 'latest'
  const service = e.GCP_RUN_SERVICE ?? 'zss-service'
  const image = `${region}-docker.pkg.dev/${project}/${repo}/zss:${tag}`
  spawntask('gcloud', ['config', 'set', 'project', project], ctx, {
    inherit: true,
  })
  return spawntask(
    'gcloud',
    [
      'run',
      'deploy',
      service,
      `--image=${image}`,
      `--region=${region}`,
      '--port',
      '8080',
      '--set-env-vars',
      'ZSS_SERVER_PORT=8080,ZSS_DATA_DIR=/data',
      '--allow-unauthenticated',
    ],
    ctx,
    { inherit: true },
  )
}

function rungcpvmdocker(ctx: TaskContext): number {
  const e = taskenv(ctx)
  const image = requiretaskenv(ctx, 'GCP_PUSH_IMAGE')
  if (!image) {
    return 1
  }
  const port = e.GCP_APP_PORT ?? '4175'
  const vol = e.GCP_DOCKER_VOLUME ?? 'zss-data'
  const runline = `docker run -d --restart unless-stopped -p ${port}:${port} -v ${vol}:/data -e ZSS_SERVER_PORT=${port} ${image}`
  if (e.GCP_RUN_LOCAL === '1') {
    console.log('Running on local machine (VM shell):')
    return spawntask('sh', ['-c', runline], ctx, { inherit: true })
  }
  const project = requiretaskenv(ctx, 'GCP_PROJECT_ID')
  if (!project) {
    return 1
  }
  const zone = e.GCP_ZONE ?? 'us-west1-a'
  const name = e.GCP_VM_NAME ?? 'zss-vm'
  console.log(
    'Run this on the VM (after: sudo apt update && sudo apt install -y docker.io && sudo usermod -aG docker $USER):',
  )
  console.log('')
  console.log(runline)
  console.log('')
  console.log('Or from your laptop:')
  console.log(
    `gcloud compute ssh ${name} --zone=${zone} --project=${project} --command="sudo ${runline}"`,
  )
  return 0
}

export const DEPLOY_TASKS: TaskDef[] = [
  def('deploy:aws-ec2:docker-run', {
    description: 'Run zss on AWS EC2 via Docker',
    tags: ['deploy'],
    run: handler(runawsec2docker),
  }),
  def('deploy:cloudflare:brick', {
    description: 'Deploy brick worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'ops/infra/wrangler-brick.toml']),
  }),
  def('deploy:cloudflare:bytes', {
    description: 'Deploy bytes worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'ops/infra/wrangler-bytes.toml']),
  }),
  def('deploy:cloudflare:terminal', {
    description: 'Deploy terminal worker to Cloudflare',
    tags: ['deploy'],
    run: exec(['wrangler', 'deploy', '-c', 'ops/infra/wrangler-terminal.toml']),
  }),
  def('zns:vga:sync', {
    description:
      'Generate embedded VGA font module for ZNS worker (ops/infra/generated/zns-vga-font.js)',
    tags: ['deploy'],
    group: 'deploy',
    run: handler(runznsvgasync),
  }),
  def('deploy:cloudflare:zns', {
    description: 'Deploy zns worker to Cloudflare',
    tags: ['deploy'],
    deps: ['zns:vga:sync'],
    run: exec(['wrangler', 'deploy', '-c', 'ops/infra/wrangler-zns.toml']),
  }),
  def('deploy:cloudflare:zns:verify', {
    description:
      'Deploy zns worker then verify production tenant DNS and HTTPS',
    tags: ['deploy'],
    deps: ['deploy:cloudflare:zns'],
    run: handler(runznstenantverify),
  }),
  def('zns:tenant:dns:check', {
    description:
      'DNS check for *.at.zed.cafe tenant wildcards in production (dig only)',
    tags: ['deploy', 'ci'],
    group: 'deploy',
    run: handler((ctx) =>
      runznstenantverify({ ...ctx, args: ['--dns-only', ...ctx.args] }),
    ),
  }),
  def('zns:tenant:verify', {
    description:
      'Full production verify: tenant DNS + HTTPS apex, index, and scroll',
    tags: ['deploy', 'ci'],
    group: 'deploy',
    run: handler(runznstenantverify),
  }),
  def('zns:tenant:smoke', {
    description:
      'HTTPS smoke test docs.at.zed.cafe/ tenant index (subset of zns:tenant:verify)',
    tags: ['deploy'],
    group: 'deploy',
    run: shell(
      'code=$(curl -fsS -o /dev/null -w "%{http_code}" https://docs.at.zed.cafe/) && test "$code" = "200"',
    ),
  }),
  def('zns:email:preview', {
    description:
      'Write ZNS login email preview PNG + HTML + assert tenant VGA palette parity (ops/infra/generated/zns-email-preview.{png,html})',
    tags: ['dev', 'ci'],
    group: 'deploy',
    deps: ['zns:vga:sync'],
    run: handler(runznsemailpreview),
  }),
  def('zns:grid:preview', {
    description:
      'Write CP437 0–255 VGA calibration HTML + assert web-safe glyph mapping (ops/infra/generated/zns-grid-preview.html)',
    tags: ['dev', 'ci'],
    group: 'deploy',
    deps: ['zns:vga:sync'],
    run: handler(runznsgridpreview),
  }),
  def('zns:scroll:preview', {
    description:
      'Write scroll tape HTML preview + assert cliscroll/helptext rendering (ops/infra/generated/zns-scroll-preview.html)',
    tags: ['dev', 'ci'],
    group: 'deploy',
    run: handler(runznsscrollpreview),
  }),
  def('zns:landing:dev', {
    description:
      'Local ZNS worker dev server — apex landing at http://127.0.0.1:8787/',
    tags: ['dev'],
    group: 'deploy',
    deps: ['zns:vga:sync'],
    run: exec([
      'wrangler',
      'dev',
      '-c',
      'ops/infra/wrangler-zns.toml',
      '--local-protocol=http',
      '--ip',
      '127.0.0.1',
      '--port',
      '8787',
    ]),
  }),
  def('deploy:docker:build:image', {
    description: 'Docker build zss:local (internal)',
    run: shell(
      'docker build --no-cache -f ops/deploy/Dockerfile -t zss:local .',
    ),
  }),
  tasksonly(
    'deploy:docker:build',
    'Build linux CLI and local Docker image',
    ['cli:build:linux', 'deploy:docker:build:image'],
    {
      tags: ['deploy'],
    },
  ),
  def('deploy:docker:run', {
    description: 'Run local Docker container',
    tags: ['deploy'],
    run: handler(rundockerrunhelp),
  }),
  def('deploy:docker:shell:exec', {
    description: 'Docker run interactive shell (internal)',
    run: shell('docker run --rm -it --init zss:local ./start.sh'),
  }),
  tasksonly(
    'deploy:docker:shell',
    'Build and open shell in local Docker image',
    ['deploy:docker:build', 'deploy:docker:shell:exec'],
    {
      tags: ['deploy'],
    },
  ),
  def('deploy:droplet:docker-run', {
    description: 'Run zss on DigitalOcean droplet via Docker',
    tags: ['deploy'],
    run: handler(rundigitaloceandocker),
  }),
  def('deploy:gcp-cloudrun:run', {
    description: 'Deploy zss to GCP Cloud Run',
    tags: ['deploy'],
    run: handler(rungcpdeploycloudrun),
  }),
  def('deploy:gcp-vm:create', {
    description: 'Create GCP VM for zss',
    tags: ['deploy'],
    run: handler(rungcpvmcreate),
  }),
  def('deploy:gcp-vm:docker-run', {
    description: 'Run zss Docker on GCP VM',
    tags: ['deploy'],
    run: handler(rungcpvmdocker),
  }),
  def('deploy:gcp-vm:firewall', {
    description: 'Configure GCP VM firewall rules',
    tags: ['deploy'],
    run: handler(rungcpvmfirewall),
  }),
  def('deploy:gcp:artifact-repo', {
    description: 'Create GCP artifact registry repo',
    tags: ['deploy'],
    run: handler(rungcpartifactrepo),
  }),
  def('deploy:gcp:enable-apis', {
    description: 'Enable required GCP APIs',
    tags: ['deploy'],
    run: handler(rungcpenableapis),
  }),
  def('deploy:gcp:push', {
    description: 'Push zss image to GCP artifact registry',
    tags: ['deploy'],
    run: handler(rungcppush),
  }),
  def('deploy:vm:docker-run', {
    description: 'Run zss Docker on generic VM',
    tags: ['deploy'],
    run: handler(runvmzssdocker),
  }),
]
