import {
  parsebrowsercontrol,
  runbrowsercontrol,
  writebrowserauth,
} from 'zss/feature/broadcast/browsercontrol'

describe('runbrowsercontrol', () => {
  const originalfetch = global.fetch

  afterEach(() => {
    global.fetch = originalfetch
    jest.restoreAllMocks()
  })

  it('stores bearer on attach and GETs status', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://example.com', title: 'Example' }),
    })) as unknown as typeof fetch

    const line = await runbrowsercontrol({
      action: 'attach',
      bearer: 'tok_attach',
    })
    expect(line).toContain('example.com')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://127.0.0.1:8890/status',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_attach',
        }),
      }),
    )
  })

  it('POSTs goto after attach', async () => {
    writebrowserauth('https://127.0.0.1:8890', 'tok_attach')
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://example.com' }),
    })) as unknown as typeof fetch

    const line = await runbrowsercontrol({
      action: 'goto',
      url: 'https://example.com',
    })
    expect(line).toContain('https://example.com')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://127.0.0.1:8890/goto',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      }),
    )
  })

  it('fails goto without a stored bearer', async () => {
    writebrowserauth('https://127.0.0.1:8890', '')
    await expect(
      runbrowsercontrol({ action: 'goto', url: 'https://example.com' }),
    ).rejects.toThrow(/bearer missing/)
  })
})

describe('parsebrowsercontrol', () => {
  it('accepts known actions and copies fields', () => {
    expect(
      parsebrowsercontrol({
        action: 'click',
        x: 10,
        y: 20,
        bearer: 'tok',
      }),
    ).toEqual({
      action: 'click',
      x: 10,
      y: 20,
      bearer: 'tok',
    })
  })

  it('rejects unknown actions', () => {
    expect(parsebrowsercontrol({ action: 'explode' })).toBeUndefined()
  })
})
