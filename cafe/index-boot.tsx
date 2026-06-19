/** Route to minimal wanix-vm boot or full app — avoids loading R3F/platform before gojs VM setup. */

function iswanixvmonly(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const q = new URLSearchParams(window.location.search).get('ZSS_WANIX_VM')
  return q === '1' || q === 'true'
}

async function main() {
  if (iswanixvmonly()) {
    await import('./wanix-vm-e2e')
    return
  }
  await import('./index-app')
}

main().catch(console.error)
