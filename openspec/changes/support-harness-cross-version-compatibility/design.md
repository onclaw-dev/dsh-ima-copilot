## Context

The plugin currently compiles and bundles directly against the `dsh-v0.1.1-rc.2` Host and Client surfaces. Host code imports `settingsNamespace`, `credentialRef`, and `defineTool`; Client code obtains `connection.api.credentials` and parses its nested RPC envelope; public declarations expose baseline Harness types. This makes the generated artifact sensitive to upstream API movement even when IMA business behavior is unchanged.

The official immutable tag audit currently spans eleven tags. Ten have isolated initialized checkouts under `/Users/roncao/deepseek-harness`; `dsh-v0.1.2-alpha.1` remains intentionally excluded from runtime environments because of its Node 24 Client Loader defect, although its Git object is available for source audit. Exact npm packages are unavailable for `alpha.1` and `0.1.3-alpha.1`, so source audit and formal installable support must remain distinct.

This change crosses Host bootstrap, Client bootstrap, native tool construction, settings lifecycle, declaration generation, packaging, compatibility evidence, and multi-version verification. The repository's `guild.md` and the Workflow Designer implementation provide process and evidence patterns, but the IMA contract and provider closure must be derived independently from this plugin's actual calls.

## Goals / Non-Goals

**Goals:**

- Freeze current IMA semantics in a narrow `IMA-BASE-1` contract.
- Support equivalent Harness tags through reusable capability adapters and one production artifact.
- Preserve an immutable, machine-validated audit trail for every official tag in scope.
- Prove the static Client boot graph and same-tarball behavior on every reproducible target.
- Fail unsupported environments before registration side effects and without exposing secrets.
- Keep `dsh-v0.1.1-rc.2` as the sole type-check/build baseline.

**Non-Goals:**

- Automatically support future tags, floating branches, or npm dist-tags.
- Restore `dsh-loader` compatibility logic.
- Bundle, emulate, or polyfill a Harness provider.
- Produce different production bundles for different tags.
- Claim registry, package, or live compatibility from source review alone.
- Upgrade the development baseline, publish npm content, create or push Git tags, or mutate a remote repository.

## Decisions

### 1. Separate the stable contract, audited native families, and executable adapters

`IMA-BASE-1` will describe plugin semantics rather than Harness object shapes. Host operations will cover lifecycle ownership, tool registration, credential resolution, and optional settings attachment. Client operations will cover safe credential description and writes plus keyed settings-card registration.

The audit catalog will initially retain three native families:

| Family | Tags | Relevant native shape |
| --- | --- | --- |
| `IMA-HIF-1` | `0.1.0-rc.7` through `0.1.1-rc.2` | Credentials accessed through `connection.api` with request objects and nested RPC result envelopes |
| `IMA-HIF-2` | `0.1.2-alpha.1` | Credentials moved to generated `remote.credentials` positional methods; legacy Host settings helper still exported |
| `IMA-HIF-3` | `0.1.2-alpha.2` through `0.1.3-alpha.1` | Gateway credentials retained; `settingsNamespace` public helper removed and Remote error vocabulary changed |

Only two Client implementations are needed: legacy Connection and Gateway Remote. `IMA-HIF-2` and `IMA-HIF-3` share the Gateway implementation because the normalized credential operations are identical. Host family wrappers share one structural implementation that passes a validated namespace string to `settings.register`; this is accepted by the older runtime and is the public contract in newer tags. Family-specific files may re-export shared code so the catalog remains explicit without copying behavior.

Alternative considered: one adapter per tag. Rejected because it duplicates identical behavior and makes audit identity, rather than capability, control runtime logic.

Alternative considered: collapse HIF-2 and HIF-3 in the evidence catalog. Rejected because removal of a currently imported public Host symbol is a material source-interface change that must remain auditable even though the new boundary normalizes it away.

### 2. Detect capabilities, never version order

Client bootstrap will safely retrieve declared services through `ctx.get` and guarded property access. It will first validate common `slots.inject`, `slots.register`, and lifecycle capabilities, then test the complete Gateway credential method set, then the complete legacy set. Detection will not invoke credential methods.

The Gateway shape wins if both shapes are present. Runtime identity, when available, is diagnostic only. Exact deny rules are allowed after capability detection for a documented known semantic defect, but none are initially planned; the `alpha.1` exclusion belongs to verification policy because its loader fails before a plugin adapter can correct it.

Alternative considered: compare semantic versions. Rejected because a version string neither proves injected services nor survives repackaging and development environments reliably.

### 3. Remove version-specific Harness types and helpers from business and published surfaces

Plugin-owned structural interfaces will replace `IApiClient['credentials']`, `ConnectionHandle`, raw Harness `Context`, branded credential references, and branded settings namespaces in business code and emitted declarations. Adapter modules alone may use baseline types for development assistance, and those types must not survive as target-specific public declaration requirements.

The Host adapter will validate credential reference and settings namespace grammar locally before passing strings to services. Native tool construction will use a plugin-owned specification and an audited structural conversion at the adapter boundary, preserving argument validation, output schema, timeout, render, and cancellation semantics without importing a version-specific helper into business code.

Alternative considered: widen DSH peer dependency ranges. Rejected because prerelease ranges are error-prone, can cause cross-release provider mixing, conflict with the exact-baseline repository rule, and leave declaration/runtime coupling intact.

Alternative considered: bundle Harness helpers. Rejected where doing so would copy provider behavior or internal Harness semantics. Only plugin-specific validation and structural normalization belong in this package.

### 4. Use a static provider closure and one Client module

The production package will retain one Client module ID and factory-form CJS registration. The plugin-level service declaration will cover `slots`, `connection`, and `remote`; the package-level provider injection set will be derived and then checked against each real tag's boot graph. The likely minimal set remains Client Connection plus UI Settings Plugins, whose version-native dependency graph supplies slots and API Remotes, but this is a hypothesis until the automated boot-graph check passes.

No production environment variable may select a version-specific entry or adapter. Every supported adapter must be present in the same Client bundle.

Alternative considered: inject every old and new provider explicitly. Rejected because a missing package can fail graph construction before capability detection runs.

### 5. Store compatibility facts separately from Cordis composition

`patch/` will be the compatibility fact root, following the established repository guide. `cordis.patch.yml` will continue to mount the Host plugin only and will not contain version branches.

The catalog will include schemas, a single index, `IMA-BASE-1` contract records, adapter metadata, and per-tag `manifest.json`, `dependencies.json`, `interface.json`, and `verification.json`. A validator will enforce identities, ordering, exact dependencies, references, statuses, exclusion invariants, and generated-report consistency.

The readable audit document will be generated deterministically from the catalog; it will not become an independent source of truth.

### 6. Define support by evidence layers and the same tarball

The verification workflow will build and pack once, calculate SHA-256, and install that absolute tarball into isolated fixtures with each tag's exact providers. Source checkouts, fixtures, caches, local links, credentials, and runtime state must not enter the tarball.

`audited`, `registry`, `packageVerification`, and `liveSmoke` remain independent. `alpha.1` is expected to be audited but runtime-excluded and registry-unavailable. `0.1.3-alpha.1` is expected to be audited but registry-unavailable. All other tags remain candidates until their boot graph and same-tarball fixture pass.

Alternative considered: rebuild against each tag. Rejected because different digests prove separate artifacts, not one package's cross-version compatibility.

### 7. Do not change the development baseline as part of compatibility expansion

`package.json.deepseekHarness`, exact baseline DSH development dependencies, README baseline identity, and the default link script remain anchored to `dsh-v0.1.1-rc.2`. Matrix tooling will use isolated fixtures rather than repointing the repository's working `node_modules` repeatedly.

A later baseline adoption requires a separate upstream changelog/diff audit, exact workspace publication checks, atomic lockfile update, repository verification sequence, version migration check, and explicit release authorization.

## Risks / Trade-offs

- **[Capability shapes can be structurally identical while semantics differ]** → Retain per-tag source evidence, response/error contract tests, and optional exact deny rules after capability matching.
- **[The static provider union may not boot on the oldest family]** → Compute the real graph for every family before implementation is considered complete; narrow formal support if no common closure exists.
- **[Direct structural tool construction could drift from `defineTool`]** → Freeze baseline behavior tests, validate raw schemas and execution results, and run the same tool contract against every fixture.
- **[Public declarations may accidentally retain baseline-only imports]** → Add declaration and packed-file scans plus consumer type-check fixtures.
- **[A registry package can exist while its transitive graph mixes releases]** → Inspect resolved direct and relevant transitive DSH versions in each isolated fixture.
- **[Alpha.1 cannot receive normal runtime proof]** → Preserve its explicit exclusion and source-only status; do not generalize its result from alpha.2.
- **[Live smoke requires credentials and a Web profile]** → Treat missing environment as `not-run`, never solicit or log secret literals, and keep package verification independent.
- **[Compatibility machinery increases maintenance cost]** → Generate reports from schemas and require incremental per-tag evidence so future audits remain bounded.

## Migration Plan

1. Add baseline behavior tests and machine-readable `IMA-BASE-1` records without changing production behavior.
2. Add the compatibility catalog, schemas, immutable tag records, validator, and generated audit report.
3. Introduce Host and Client contract objects and migrate business modules behind them.
4. Implement legacy and Gateway adapters, safe capability inspection, structured unsupported errors, and adapter routing tests.
5. Remove baseline-specific types from public declarations and remove runtime imports of helpers that prevent cross-family loading.
6. Finalize the static Client injection closure and add bundle/declaration/package boundary checks.
7. Build and pack once, then run isolated boot-graph and package matrices for registry-reproducible tags.
8. Run live smoke only where an existing valid environment is available; record all unavailable or unrun layers honestly.
9. Update README compatibility claims only from validated catalog output.

Rollback is a normal source revert before release. No persistent user data migration is introduced. Settings and credential names remain unchanged, so reverting the adapter layer does not rewrite or delete user configuration.

## Open Questions

- Does the real boot graph confirm that `@deepseek-ai/dsh-client-connection` plus `@deepseek-ai/dsh-client-ui-settings-plugins` is the smallest safe package injection set across all reproducible families?
- Can rc.7 declaration verification avoid the unpublished `dsh-client-ui-renderer` entirely after public types are structural, or is an additional legacy declaration fixture required?
- Should source-audited but registry-unavailable tags appear in the README main matrix or only in the generated detailed audit, provided both clearly exclude them from formal support?
