# Desktop helper signing

Windows installers for the Tauri desktop helpers ship on GitHub Releases (`v*` tags). macOS builds are unsigned until an Apple Developer ID is configured.

## Windows (SignPath OSS)

Free code signing for eligible open-source projects: [SignPath open source](https://signpath.io/solutions/open-source-community).

**Attribution (required on project home / Releases):**

> Free code signing provided by SignPath.io, certificate by SignPath Foundation.

### 1. Apply

1. Apply at https://signpath.io/solutions/open-source-community
2. Point at `https://github.com/goldbuick/zed-software-system`
3. Describe both helpers:
   - **YouTube relay** (`ops/youtube-rtmp-relay`) -- WHIP to RTMPS local tray app
   - **Media queue** (`ops/media-queue`) -- PeerJS browser capture for `#media` board TV
4. Note SmartScreen / download warnings on unsigned Windows `.exe` installers
5. Confirm OSI license, public repo, free GitHub Releases distribution

Approval is usually a few business days.

### 2. SignPath dashboard (after approval)

One project covers both helpers:

| Setting | Value |
|---------|-------|
| Project slug | `zed-cafe-desktop` |
| Signing policy slug | `release-signing` |
| Trusted build system | GitHub.com |
| Repository | `goldbuick/zed-software-system` |
| Workflow | `.github/workflows/on-push-tag-release.yml` |
| Branch/tag pattern | `refs/tags/v*` |
| Approval mode | Automatic (OSS Foundation default) |

Create **two** artifact configurations (same PE/NSIS shape, different slugs for audit):

| App | Artifact configuration slug | Import XML |
|-----|----------------------------|------------|
| YouTube relay | `youtube-relay-nsis` | [`.signpath/artifact-configuration-youtube-relay-nsis.xml`](../../.signpath/artifact-configuration-youtube-relay-nsis.xml) |
| Media queue | `media-queue-nsis` | [`.signpath/artifact-configuration-media-queue-nsis.xml`](../../.signpath/artifact-configuration-media-queue-nsis.xml) |

For each config, upload a sample unsigned NSIS `.exe` from a local `yarn task run relay:build:desktop:win` or `mediaqueue:build:desktop:win` build if the XML import is not offered.

Install the **SignPath GitHub App** on the repo (read access to Actions artifacts).

Policy file (default branch): [`.signpath/policies/zed-cafe-desktop/release-signing.yml`](../../.signpath/policies/zed-cafe-desktop/release-signing.yml)

### 3. GitHub repository secrets

| Secret | Source |
|--------|--------|
| `SIGNPATH_API_TOKEN` | SignPath user with submit permission on `release-signing` |
| `SIGNPATH_ORG_ID` | SignPath organization UUID |

Until both secrets exist, tag releases upload **unsigned** Windows `.exe` installers.

### 4. Verify a release

After pushing a tag (e.g. `v1.12.20`):

1. Open the release assets:
   - `Zed Cafe YouTube Relay_*_x64-setup.exe`
   - `Zed Cafe Media Queue_*_x64-setup.exe`
2. Windows: file **Properties** -> **Digital Signatures** -> SignPath Foundation
3. Optional on a Windows machine:

```powershell
signtool verify /pa /v "Zed Cafe YouTube Relay_*_x64-setup.exe"
signtool verify /pa /v "Zed Cafe Media Queue_*_x64-setup.exe"
```

### CI behavior

`.github/workflows/on-push-tag-release.yml` runs two Windows jobs:

| Job | Build task | SignPath artifact slug |
|-----|------------|------------------------|
| `relay-windows` | `relay:build:desktop:win` | `youtube-relay-nsis` |
| `mediaqueue-windows` | `mediaqueue:build:desktop:win` | `media-queue-nsis` |

Each job builds the Tauri NSIS installer, uploads the unsigned `.exe` as a named workflow artifact, and when secrets are set submits to SignPath (`signpath/github-action-submit-signing-request@v2`). The signed `.exe` is attached to the GitHub Release.

## macOS

Public distribution without Gatekeeper warnings needs an Apple Developer Program membership ($99/year), Developer ID Application cert, and notarization. Not wired in CI yet; users use **Open Anyway** on first launch.

## Related

- Release workflow: [`.github/workflows/on-push-tag-release.yml`](../../.github/workflows/on-push-tag-release.yml)
- YouTube relay: [`ops/youtube-rtmp-relay/README.md`](../youtube-rtmp-relay/README.md)
- Media queue: [`ops/media-queue/README.md`](../media-queue/README.md)
- Helpers design: [`local-media-helpers-tauri.mdx`](local-media-helpers-tauri.mdx)
- SignPath GitHub docs: https://docs.signpath.io/trusted-build-systems/github
