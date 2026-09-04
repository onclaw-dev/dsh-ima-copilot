## Why

The plugin currently pins and imports one exact DeepSeek Harness release, so routine Harness changes force a plugin rebuild even when the IMA integration itself is unchanged. The browser settings card also depends on a version-specific credentials Remote and plugin-tab contract.

## What Changes

- **BREAKING** Replace direct Harness npm and source dependencies with the existing `@dsh-plugin/dsh-loader` contract.
- Route Host tool, credential, settings, and Web access through `ctx.dshLoader`.
- Replace the version-specific browser credentials Remote with a same-origin, fixed-reference plugin API.
- Move IMA configuration from `settings.plugin.item` to a standalone `settings.section` page.
- Compose Client settings and slots exclusively through dsh-loader stable UI subpaths.
- Enforce a repository-wide check that rejects real Harness package names in code, artifacts, manifests, lockfiles, and documentation.
- Adopt independent plugin SemVer beginning at `0.2.0` and stop encoding the Harness version in plugin releases.

## Capabilities

### New Capabilities

- `loader-compatible-ima-plugin`: Loader-mediated Host integration, secure browser credential configuration, standalone settings UI, and independent release versioning.

### Modified Capabilities

None.

## Impact

This affects the Host and Client entry points, credential settings transport, Client bundle composition, npm dependencies, lockfile, tests, README, and repository release instructions. Existing credential reference names and stored values remain unchanged.
