import {
  probewanixtoolchains,
  readhellolangready,
  type WanixProbeResult,
  type WanixToolchainDeps,
} from 'ops/lib/wanix/wanixtoolchains'

function mockdeps(
  whichmap: Record<string, string | undefined>,
  execmap: Record<string, string> = {},
): WanixToolchainDeps {
  return {
    which: (name) => whichmap[name],
    exec: (cmd, args) => {
      const key = `${cmd} ${args.join(' ')}`
      return execmap[key]
    },
    exists: (filepath) => filepath.includes('go.mod') || filepath.includes('wasi-sdk'),
    platform: 'darwin',
  }
}

describe('wanixtoolchains', () => {
  it('marks wabt required and missing when wat2wasm absent', () => {
    const results = probewanixtoolchains(
      mockdeps({ 'wasm-validate': '/usr/bin/wasm-validate' }),
    )
    const wabt = results.find((row) => row.id === 'wabt')
    expect(wabt?.required).toBe(true)
    expect(wabt?.status).toBe('missing')
  })

  it('marks rust partial when wasm32-wasip1 target not installed', () => {
    const results = probewanixtoolchains(
      mockdeps(
        { rustc: '/usr/bin/rustc', rustup: '/usr/bin/rustup' },
        { 'rustup target list --installed': 'aarch64-apple-darwin',
        },
      ),
    )
    const rust = results.find((row) => row.id === 'rust')
    expect(rust?.status).toBe('partial')
    expect(rust?.nextsteps).toContain('rustup target add wasm32-wasip1')
  })

  it('readhellolangready returns ready only for ok probes', () => {
    const rows: WanixProbeResult[] = [
      {
        id: 'zig',
        label: 'zig',
        covers: ['hello-zig'],
        required: false,
        status: 'missing',
        detail: 'zig not on PATH',
        version: '',
        installdarwin: ['brew install zig'],
        installlinux: ['sudo apt install zig'],
        nextsteps: [],
      },
    ]
    expect(readhellolangready(rows, 'zig')).toEqual({
      ready: false,
      reason: 'zig not on PATH',
    })
  })

  it('classifies docker as optional overlay tooling', () => {
    const results = probewanixtoolchains(mockdeps({ docker: '/usr/bin/docker' }))
    const docker = results.find((row) => row.id === 'docker')
    expect(docker?.required).toBe(false)
    expect(docker?.covers).toContain('zedcafe-linux-overlay')
  })
})
