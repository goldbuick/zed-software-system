# Submodules and vendored third-party trees

External dependencies linked from the main repo live here.

| Path | Kind | Upstream | Pin notes |
|------|------|----------|-----------|
| `DaisySP/` | git submodule | [electro-smith/DaisySP](https://github.com/electro-smith/DaisySP) | Pinned commit in parent repo |
| `DaisySP-LGPL/` | vendored subset (committed) | [electro-smith/DaisySP-LGPL](https://github.com/electro-smith/DaisySP-LGPL) | LGPL sources for Daisy build |
| `wanix/` | git submodule (ZSS fork patch) | [tractordev/wanix](https://github.com/tractordev/wanix) + local dirty-forward | See below — **push fork commits** |

## Clone / update

After cloning the repo:

```bash
git submodule update --init --recursive
```

Or when cloning fresh:

```bash
git clone --recurse-submodules <repo-url>
```

## Wanix (ZSS fork patch)

Parent pins a **submodule commit** that adds a generic gojs->host `postMessage`
bridge (`__wanixOnGojsWorkerMessage(taskId, data)`, with a legacy
`__wanixOnZedcafeExportDirty(taskId)` fallback) to
[`web/worker/worker.go`](wanix/web/worker/worker.go). That commit is **not** on
upstream `tractordev/wanix`.

### Durable setup (required)

1. Keep the recoverable patch in the parent: [`ops/patches/wanix-worker-zedcafeexportdirty.patch`](../ops/patches/wanix-worker-zedcafeexportdirty.patch).
2. After changing the patch: commit **inside** `submodules/wanix`, rebuild `cafe/public/wanix/wanix.wasm`, bump the parent gitlink, then **push the submodule commit** to a remote that `.gitmodules` can fetch. A parent-only gitlink with no published object makes `git submodule update` fail forever.
3. Durable remote is [`goldbuick/wanix`](https://github.com/goldbuick/wanix) (fork of tractordev); `.gitmodules` points there with `branch = zss-zedcafe-dirty-forward`. Keep `upstream` → tractordev for rebases.
4. Toolchain probe (`ops:fixtures:wanix:toolchains`) and zedcafe build fail loudly if neither the `__wanixOnGojsWorkerMessage` nor the legacy `__wanixOnZedcafeExportDirty` marker is present in `worker.go`.

After a new patch commit, push so the parent gitlink stays fetchable:

```bash
git -C submodules/wanix push origin zss-zedcafe-dirty-forward
```

### Recover lost checkout

If the pin SHA is unreachable (common after a local-only submodule commit):

```bash
git -C submodules/wanix fetch origin
git -C submodules/wanix checkout eea9759e8b051bb44f525dcaa30db353e921d8a0   # or current upstream base in the patch header
git -C submodules/wanix apply ../../ops/patches/wanix-worker-zedcafeexportdirty.patch
cd submodules/wanix && git add web/worker/worker.go && git commit -m "ZSS: generic gojs->host message bridge"
cd ../..
# rebuild wasm (see zss/feature/wanix/README.md), bump gitlink, push submodule remote
```

Base commit for the patch is wherever `git apply` is clean; refresh the patch with `git -C submodules/wanix diff` after edits.

## Daisy build

Daisy WASM build reads sources from `DaisySP/` and `DaisySP-LGPL/` — see [`zss/feature/synth/backend/daisy/native/build-daisy.sh`](../zss/feature/synth/backend/daisy/native/build-daisy.sh).
