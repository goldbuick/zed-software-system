# Desktop helper signing

Windows installers for the Electron media-queue helper ship on GitHub Releases (`v*` tags). macOS builds are unsigned until an Apple Developer ID is configured.

## Windows (SignPath OSS)

Free code signing for eligible open-source projects: [SignPath open source](https://signpath.io/solutions/open-source-community).

**Attribution (required on project home / Releases):**

> Free code signing provided by SignPath.io, certificate by SignPath Foundation.

### 1. Apply

1. Apply at https://signpath.io/solutions/open-source-community
2. Point at `https://github.com/goldbuick/zed-software-system`
3. Describe the helper:
   - **Media queue** (`ops/media-queue`) -- PeerJS `video.captureStream()` for `#media` board TV
4. Note SmartScreen / download warnings on unsigned Windows `.exe` installers
5. Confirm OSI license, public repo, free GitHub Releases distribution

Approval is usually a few business days.

### 2. SignPath dashboard (after approval)

| Setting | Value |
|---------|-------|
| Project slug | `zed-cafe-desktop` |
| Signing policy slug | `release-signing` |
| Trusted build system | GitHub.com |
| Repository | `goldbuick/zed-software-system` |
| Workflow | `.github/workflows/on-push-tag-release.yml` |
| Branch/tag pattern | `refs/tags/v*` |
| Approval mode | Automatic (OSS Foundation default) |

Artifact configuration:

| App | Artifact configuration slug | Import XML |
|-----|----------------------------|------------|
| Media queue | `media-queue-nsis` | [`.signpath/artifact-configuration-media-queue-nsis.xml`](../../.signpath/artifact-configuration-media-queue-nsis.xml) |

Upload a sample unsigned NSIS `.exe` from a local `yarn task run mediaqueue:build:desktop:win` build if the XML import is not offered.

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

1. Open the release asset: `Zed Cafe Media Queue_*_x64-setup.exe`
2. Windows: file **Properties** -> **Digital Signatures** -> SignPath Foundation
3. Optional on a Windows machine:

```powershell
signtool verify /pa /v "Zed Cafe Media Queue_*_x64-setup.exe"
```

### CI behavior

`.github/workflows/on-push-tag-release.yml` runs a Windows job:

| Job | Build task | SignPath artifact slug |
|-----|------------|------------------------|
| `mediaqueue-windows` | `mediaqueue:build:desktop:win` | `media-queue-nsis` |

The job builds the Electron NSIS installer, uploads the unsigned `.exe` as a named workflow artifact, and when secrets are set submits to SignPath (`signpath/github-action-submit-signing-request@v2`). The signed `.exe` is attached to the GitHub Release.

## macOS

Public distribution without Gatekeeper warnings needs an Apple Developer Program membership ($99/year), Developer ID Application cert, and notarization. Not wired in CI yet; users use **Open Anyway** on first launch.

## Related

- Release workflow: [`.github/workflows/on-push-tag-release.yml`](../../.github/workflows/on-push-tag-release.yml)
- Media queue: [`ops/media-queue/README.md`](../media-queue/README.md)
- Helpers design: [`local-media-helpers-tauri.mdx`](local-media-helpers-tauri.mdx)
- SignPath GitHub docs: https://docs.signpath.io/trusted-build-systems/github
