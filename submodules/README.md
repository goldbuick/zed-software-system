# Submodules and vendored third-party trees

External dependencies linked from the main repo live here.

| Path | Kind | Upstream | Pin notes |
|------|------|----------|-----------|
| `DaisySP/` | git submodule | [electro-smith/DaisySP](https://github.com/electro-smith/DaisySP) | Pinned commit in parent repo |
| `DaisySP-LGPL/` | vendored subset (committed) | [electro-smith/DaisySP-LGPL](https://github.com/electro-smith/DaisySP-LGPL) | LGPL sources for Daisy build |

## Clone / update

After cloning the repo:

```bash
git submodule update --init --recursive
```

Or when cloning fresh:

```bash
git clone --recurse-submodules <repo-url>
```

## Daisy build

Daisy WASM build reads sources from `DaisySP/` and `DaisySP-LGPL/` — see [`zss/feature/synth/backend/daisy/native/build-daisy.sh`](../zss/feature/synth/backend/daisy/native/build-daisy.sh).
