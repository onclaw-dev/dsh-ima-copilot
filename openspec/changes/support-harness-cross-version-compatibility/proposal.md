## Why

DeepSeek Harness evolves through immutable releases that have already changed the IMA plugin's Host and Client interfaces, while the previous loader-based compatibility approach proved too fragile to retain. The plugin needs an explicit, auditable compatibility boundary so one published artifact can safely support every verified Harness interface family without following floating branches or mixing release packages.

## What Changes

- Establish `IMA-BASE-1`, a stable internal Host and Client contract derived from the current `dsh-v0.1.1-rc.2` behavior.
- Inventory every official immutable Harness tag, commit, exact provider set, plugin-relevant interface delta, interface-family mapping, and independent verification status.
- Add capability-detected adapters for the legacy `connection.api.credentials` surface and the newer `remote.credentials` surface, while sharing implementations wherever the normalized contract is identical.
- Isolate business code and public declarations from raw Harness contexts, branded helper types, Remote envelopes, and tag-specific APIs.
- Preserve one Host entry, one Client entry, and one production bundle; prohibit version-selected production builds and runtime version-string routing.
- Verify supported tags against the same packed artifact and record source-only or registry-unavailable tags without overstating support.
- Keep `dsh-v0.1.1-rc.2` as the sole development baseline; this change does not upgrade the baseline or authorize publishing.

## Capabilities

### New Capabilities

- `harness-compatibility-contract`: Defines the stable IMA plugin contract, capability-based interface-family adapters, safe diagnostics, and business-layer isolation requirements.
- `harness-compatibility-catalog`: Defines immutable per-tag compatibility evidence, dependency availability, interface-family grouping, verification states, and generated audit reporting.
- `harness-compatibility-verification`: Defines boot-graph, single-bundle, same-tarball multi-tag, package-content, and optional live-smoke verification requirements.

### Modified Capabilities

None.

## Impact

- Affected Host code: plugin bootstrap, settings registration, credential resolution, native tool construction, and Harness lifecycle wiring.
- Affected Client code: credential Remote access, settings-card registration, capability detection, and public declaration output.
- Affected build and package metadata: Client injection closure, DSH dependency placement, bundle boundary checks, package contents, and verification scripts.
- New compatibility records and generated documentation will cover official tags from `dsh-v0.1.0-rc.7` through `dsh-v0.1.3-alpha.1`, with `dsh-v0.1.2-alpha.1` and registry-incomplete releases explicitly distinguished from formally supported releases.
- No npm publish, Git tag, GitHub Release, push, or remote mutation is included.
