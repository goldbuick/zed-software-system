/**
 * Filled by `vitepopulate.ts` (Vite `import.meta.glob` on `.md` files).
 * Import `zss/rom/vitepopulate` once per JS realm: `cafe/index.tsx` (main thread)
 * and `zss/simspace.ts` (sim worker). Do not import it from `rom/index.ts` — that
 * breaks Jest/Node and duplicates the mistake of populating only one realm.
 */
export const romcontent: Record<string, string> = {}
