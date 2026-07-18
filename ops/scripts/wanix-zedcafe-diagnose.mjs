/**
 * Retired — use headed validator against cafe:dev:
 *
 *   yarn task run cafe:dev
 *   yarn task run cafe:playwright:headed --url https://localhost:7777/ \
 *     tasks/lib/wanix/validate-zedcafe-vm-export.ts
 */
console.error(
  'wanix-zedcafe-diagnose.mjs is retired. Run tasks/lib/wanix/validate-zedcafe-vm-export.ts via cafe:playwright:headed.',
)
process.exit(1)
