# memoryfs

Projected MEMORY filesystem (`zss/feature/memoryfs/`).

Docs: [`docs/index.md`](docs/index.md) · Agent skills: [`docs/agent-skill.md`](docs/agent-skill.md) · Emit source: [`skills.ts`](skills.ts)

Drop a folder onto cafe → sync root is always `<dropped>/memoryfs/`. On full attach/export, cafe also writes `AGENTS.md` plus `.cursor/skills/` and `.claude/skills/` at the drop root (not inside `memoryfs/`).
