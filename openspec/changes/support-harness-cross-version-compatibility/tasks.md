## 1. Freeze the compatibility baseline

- [x] 1.1 Add focused characterization tests for the current `dsh-v0.1.1-rc.2` Host lifecycle, settings, credential, tool, Client credential, and settings-card behavior.
- [x] 1.2 Define the machine-readable `IMA-BASE-1` contract and schemas for normalized Host and Client operations, results, errors, and invariants.
- [x] 1.3 Record the baseline Release tag, npm version, full commit, repository, directly used DSH packages, and existing verification status from `package.json` and the lockfile.
- [x] 1.4 Add a boundary check that rejects raw Harness contexts, native credential/settings brands, RPC envelopes, interface-family IDs, and adapter types outside compatibility modules.

## 2. Build the immutable tag audit catalog

- [x] 2.1 Add catalog schemas and an index for contract, adapter, tag identity, dependency, interface, exclusion, and layered verification records.
- [x] 2.2 Create exact identity records for all eleven official tags from `dsh-v0.1.0-rc.7` through `dsh-v0.1.3-alpha.1`, including full commit SHAs and immutable source locations.
- [x] 2.3 Record exact relevant workspace package publication and dependency evidence per tag, distinguishing unpublished packages from failed or unrun checks and detecting mixed-release resolutions.
- [x] 2.4 Capture plugin-scoped source evidence for Host settings/credentials/tools, Client credentials/remotes/slots/settings plugins, Cordis injection, manifest, and Remote result/error contracts.
- [x] 2.5 Assign the audited families `IMA-HIF-1`, `IMA-HIF-2`, and `IMA-HIF-3`, and map each family to its reusable Host and Client adapter implementations.
- [x] 2.6 Record `dsh-v0.1.2-alpha.1` as source-audited but runtime-excluded for its documented Node 24 Client Loader defect, without inferring that status for later tags.
- [x] 2.7 Implement a catalog validator that enforces complete tag coverage, identities, ordering, exact dependencies, valid references, exclusion invariants, evidence statuses, and deterministic output.
- [x] 2.8 Generate the readable compatibility audit and matrix from the validated catalog, with no manually maintained compatibility claims outside catalog facts.

## 3. Introduce the stable Host boundary

- [x] 3.1 Define plugin-owned structural Host contracts for lifecycle, settings registration, credential resolution, native tool registration, cancellation, timeout, render, and output behavior.
- [x] 3.2 Implement local grammar validation for settings namespaces and credential references so business code no longer imports version-specific branded helpers.
- [x] 3.3 Implement the shared Host adapter and structural native-tool conversion, preserving all behavior captured by the rc.2 characterization tests.
- [x] 3.4 Add explicit HIF-family Host adapter exports that reuse the shared implementation while retaining auditable family identities.
- [x] 3.5 Migrate Host business modules to `IMA-BASE-1` operations and verify that raw Harness context and family-specific values do not cross the boundary.

## 4. Introduce capability-routed Client adapters

- [x] 4.1 Define plugin-owned Client contracts for safe credential description and writes, keyed settings-card registration, lifecycle, and normalized error handling.
- [x] 4.2 Implement guarded service discovery that validates common slots/lifecycle capabilities without invoking credential methods during detection.
- [x] 4.3 Implement the legacy Connection credential adapter for object requests and nested RPC envelopes used by `IMA-HIF-1`.
- [x] 4.4 Implement the Gateway Remote credential adapter for positional methods and direct Remote results shared by `IMA-HIF-2` and `IMA-HIF-3`.
- [x] 4.5 Implement deterministic routing with complete Gateway capability precedence, legacy fallback, and a structured unsupported-environment failure before registration side effects.
- [x] 4.6 Ensure diagnostics identify missing capabilities and the selected family without logging credential values, tokens, cookies, or other secrets.
- [x] 4.7 Migrate Client business and settings UI modules behind `IMA-BASE-1` and retain one Client module ID and factory-form CJS registration.

## 5. Decouple build, declarations, and package contents

- [x] 5.1 Remove version-specific Harness types and native RPC envelopes from exported declarations, replacing them with stable plugin-owned structural types.
- [x] 5.2 Audit `dependencies`, `devDependencies`, `peerDependencies`, and metadata so production does not require unavailable family-specific packages while the rc.2 development baseline remains exact and unchanged.
- [x] 5.3 Determine and encode the smallest static Client provider closure that boots both legacy and Gateway families; document the evidence resolving the provider-closure design question.
- [x] 5.4 Bundle every supported adapter into one production artifact with no tag-based entry, environment-variable switch, dynamic version import, or provider emulation.
- [x] 5.5 Extend package checks to reject upstream checkouts, fixtures, caches, credentials, local links, target-specific declaration imports, and unintended DSH provider code.
- [x] 5.6 Add consumer declaration fixtures, including an rc.7 path if needed, and record the evidence resolving the legacy renderer declaration question.

## 6. Verify routing and behavior

- [x] 6.1 Add unit tests for strict/throwing context getters, absent and partial capabilities, both complete credential shapes, dual-shape Gateway precedence, and no-side-effect failure.
- [x] 6.2 Add adapter contract tests for legacy and Gateway request arguments, normalized results, error variants, credential secrecy, and settings-card registration.
- [x] 6.3 Run the frozen Host tool and lifecycle behavior suite through every Host family export and confirm equivalence to `IMA-BASE-1`.
- [x] 6.4 Add static checks for one Client entry/module ID, complete adapter inclusion, provider closure, forbidden version branching, public declaration independence, and catalog drift.
- [x] 6.5 Run repository type checks, tests, build, package verification, and loader-boundary checks after restoring dependencies with the committed lockfile; fix every required failure.

## 7. Prove same-tarball compatibility

- [x] 7.1 Implement isolated per-tag fixture creation using exact published provider versions, fresh lock/install state, and no shared `node_modules`, cache, or linked checkout state.
- [x] 7.2 Build and pack once, calculate and record the tarball SHA-256, and install that same absolute tarball into every registry-reproducible tag fixture.
- [x] 7.3 Verify each fixture's resolved direct and relevant transitive DSH packages belong to its intended Release and reject cross-release mixing.
- [x] 7.4 Run the real Client boot graph, adapter selection, Host bootstrap, settings registration, credential protocol, tool execution, and package smoke checks in every eligible fixture.
- [x] 7.5 Record `audited`, `registry`, `packageVerification`, and `liveSmoke` independently for every tag, including honest unavailable, excluded, failed, and not-run reasons.
- [x] 7.6 Run live smoke only with existing valid credentials and Web profile, without requesting, printing, persisting, or packaging secret material.

## 8. Finalize documentation and support claims

- [x] 8.1 Update README compatibility, installation, development, and verification sections from validated catalog output while keeping `dsh-v0.1.1-rc.2` as the declared development baseline.
- [x] 8.2 Decide and document how source-only tags appear in the public README versus the detailed generated audit, ensuring neither placement implies formal runtime support.
- [x] 8.3 Run the catalog validator and full registry/source verification sequence, then publish a final local audit report listing supported, excluded, source-only, failed, and unverified tags.
- [x] 8.4 Confirm `package.json.deepseekHarness`, exact rc.2 DSH dependencies, lockfile, and README baseline identity remain mutually consistent and that no release version change is required.
- [x] 8.5 Prepare release notes and a suggested plugin version/tag only if the verified compatibility change warrants a release; stop before npm publish, Git tag/push, GitHub Release, or any remote mutation pending explicit user authorization.
