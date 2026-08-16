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
  it('routes bind and admin paths through bridgequeuepanel', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/firmware/cli/commands/queue.ts'),
      'utf8',
    )
    expect(src).toContain('bridgequeuepanel')
    expect(src).toContain("'bind'")
    expect(src).toContain("'skip'")
    expect(src).toContain("'clear'")
    expect(src).toContain("'stop'")
    expect(src).toContain("'limit'")
    expect(src).not.toContain('bridgemediapanel')
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
    expect(src).not.toContain('usage: #media add')
    expect(src).not.toContain('usage: #media limit')
  })
})

describe('mediamenu.ts admin links', () => {
  it('uses queue subcommands in zed links', () => {
    const src = readFileSync(
      join(process.cwd(), 'zss/feature/mediaqueue/mediamenu.ts'),
      'utf8',
    )
    expect(src).toContain("'queue skip'")
    expect(src).toContain("'queue clear'")
    expect(src).toContain("'queue stop'")
    expect(src).not.toContain("'media skip'")
  })
})
