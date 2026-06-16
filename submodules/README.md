# Submodules and vendored third-party trees

External dependencies linked from the main repo live here.

| Path | Kind | Upstream | Pin notes |
|------|------|----------|-----------|
| `DaisySP/` | git submodule | [electro-smith/DaisySP](https://github.com/electro-smith/DaisySP) | Pinned commit in parent repo |
| `DaisySP-LGPL/` | vendored subset (committed) | [electro-smith/DaisySP-LGPL](https://github.com/electro-smith/DaisySP-LGPL) | LGPL sources for Daisy build |
| `wanix/` | git submodule | [tractordev/wanix](https://github.com/tractordev/wanix) | `0.4.0-alpha8` source (`package.json`); read-only reference for host/WASI work |

## Clone / update

After cloning the repo:

```bash
git submodule update --init --recursive
```

Or when cloning fresh:

```bash
git clone --recurse-submodules <repo-url>
```

## Wanix runtime vs submodule

The **browser runtime** vendored into `cafe/public/wanix/` comes from the **npm** package (`wanix@0.4.0-alpha8`) via `yarn task run wanix:ensure`, plus `ops/patches/wanix+0.4.0-alpha8.patch` (stdin wiring in embedded WASI worker).

Use `submodules/wanix/` to read upstream source (e.g. `wasi/worker/worker.js`, `term/`, workbench host wiring) when debugging or drafting patches — not as the runtime build input.

## Daisy build

Daisy WASM build reads sources from `DaisySP/` and `DaisySP-LGPL/` — see [`zss/feature/synth/backend/daisy/native/build-daisy.sh`](../zss/feature/synth/backend/daisy/native/build-daisy.sh).
