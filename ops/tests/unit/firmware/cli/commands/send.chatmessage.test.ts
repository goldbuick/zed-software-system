import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('send.ts chat:message:player', () => {
  it('player #text emits chat:message:player not board id', () => {
    const path = join(
      process.cwd(),
      'zss/firmware/cli/commands/send.ts',
    )
    const src = readFileSync(path, 'utf8')
    expect(src).toContain('chat:message:player')
    expect(src).not.toMatch(/chat:message:\$\{READ_CONTEXT\.board/)
  })
})
