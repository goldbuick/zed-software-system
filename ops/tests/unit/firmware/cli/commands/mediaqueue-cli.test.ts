import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('media.ts CLI split', () => {
  it('routes menu and URL submit only through bridgemediapanel', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/firmware/cli/commands/media.ts'),
      'utf8',
    )
    expect(src).toContain("bridgemediapanel")
    expect(src).toContain("'menu'")
    expect(src).toContain("'add'")
    expect(src).toContain('mediaisqueueurl')
    expect(src).not.toContain('bridgequeuepanel')
    expect(src).not.toContain("'bind'")
    expect(src).not.toContain("'skip'")
    expect(src).not.toContain("'add' === cmd")
  })
})

describe('queue.ts CLI', () => {
  it('routes menu, bind, and admin paths through bridgequeuepanel', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/firmware/cli/commands/queue.ts'),
      'utf8',
    )
    expect(src).toContain('bridgequeuepanel')
    expect(src).toContain("'menu'")
    expect(src).toContain("'bind'")
    expect(src).toContain("'skip'")
    expect(src).toContain("'clear'")
    expect(src).toContain("'stop'")
    expect(src).toContain("'limit'")
    expect(src).not.toContain('bridgemediapanel')
    expect(src).not.toContain('usage: #queue <peerid> or skip')
  })
})

describe('panel.ts split', () => {
  it('documents queue-first bind and media URL usage strings', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/feature/mediaqueue/panel.ts'),
      'utf8',
    )
    expect(src).toContain('handlequeuepanel')
    expect(src).toContain('use #queue <peerid> first')
    expect(src).toContain('usage: #media <url>')
    expect(src).toContain('showqueuemenu')
    expect(src).not.toContain('usage: #media add')
    expect(src).not.toContain('usage: #media limit')
  })
})

describe('mediamenu.ts queue list', () => {
  it('renders stored submitter names without touching bridge MEMORY', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/feature/mediaqueue/mediamenu.ts'),
      'utf8',
    )
    expect(src).toContain('state.names[i]')
    expect(src).toContain('zsstexttablelines')
    // Menu renders on the bridge, where player flags do not exist.
    expect(src).not.toContain('mediaplayerdisplayname')
    expect(src).not.toContain('memoryreadflags')
    expect(src).not.toContain('zsszedlinkline')
    expect(src).not.toContain('shortplayerid')
    expect(src).not.toContain('canmanage')
  })
})

describe('mediaguards.ts payload', () => {
  it('resolves the submitter name on the VM side of the bridge hop', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/feature/mediaqueue/mediaguards.ts'),
      'utf8',
    )
    expect(src).toContain('mediaplayerdisplayname(player)')
    expect(src).toContain('displayname')
  })
})

describe('playerdisplayname.ts', () => {
  it('resolves pid to user flag via memoryreadflags', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/feature/mediaqueue/playerdisplayname.ts'),
      'utf8',
    )
    expect(src).toContain('memoryreadflags')
    expect(src).toContain('sanitizechatrostername')
  })
})

describe('queuemenu.ts admin links', () => {
  it('uses plain queue subcommand zed links and shows per-player limit', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/feature/mediaqueue/queuemenu.ts'),
      'utf8',
    )
    expect(src).toContain("'queue skip'")
    expect(src).toContain("'queue clear'")
    expect(src).toContain("'queue stop'")
    expect(src).toContain('mediaqueuereadperplayerlimit')
    expect(src).not.toContain('$cyan')
    expect(src).not.toContain('$red')
    expect(src).not.toContain("'media skip'")
  })
})
