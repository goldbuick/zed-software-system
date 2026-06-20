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

The **browser runtime** loads from jsDelivr (`wanix@0.4.0-alpha8` — see `zss/feature/wanix/wanixvmassets.ts`). `yarn task run wanix:ensure` records the npm pin in `cafe/public/wanix/BUILD_ID`.

Use `submodules/wanix/` to read upstream **0.4** source (`examples/basic-vm.html`, `elements/`, `term/`) when debugging — not as the runtime build input.

**wanix.run** is the upstream **v0.3 stock bundle** demo, not the 0.4 `<wanix-system>` integration model zed.cafe uses.

## Daisy build

Daisy WASM build reads sources from `DaisySP/` and `DaisySP-LGPL/` — see [`zss/feature/synth/backend/daisy/native/build-daisy.sh`](../zss/feature/synth/backend/daisy/native/build-daisy.sh).
