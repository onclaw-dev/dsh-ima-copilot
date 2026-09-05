## ADDED Requirements

### Requirement: Single production artifact
Cross-version verification SHALL build and pack the plugin once, SHALL calculate the tarball SHA-256, and SHALL use that unchanged tarball for every target-tag package verification.

#### Scenario: Matrix verifies multiple tags
- **WHEN** two or more registry-reproducible tags are verified
- **THEN** every result SHALL reference the same tarball digest and no fixture SHALL rewrite the manifest, Host bundle, Client bundle, declarations, or compatibility mapping

### Requirement: Static Client provider closure
The production package SHALL declare one Client entry, one loader ID, and a static provider-injection set proven against the real boot graph of every supported interface family.

#### Scenario: Required service is transitively provided
- **WHEN** the static injection set is evaluated for a target checkout
- **THEN** the boot graph SHALL provide the complete `slots`, `connection`, and `remote` capability seats needed by bootstrap before the plugin is applied

#### Scenario: No safe common injection closure exists
- **WHEN** a target family cannot boot the static provider set without requiring a provider absent from that release
- **THEN** verification SHALL fail and formal support SHALL be narrowed rather than building a tag-specific production bundle

### Requirement: Adapter routing verification
Automated tests SHALL cover every supported adapter's positive path, missing common capabilities, partially present family capabilities, simultaneous old and new capabilities, strict getter or proxy contexts, known deny rules, and diagnostic redaction.

#### Scenario: Both credential surfaces are present
- **WHEN** a test context exposes complete legacy and Gateway credential surfaces
- **THEN** the Gateway adapter SHALL be selected deterministically

#### Scenario: Getter throws for an unavailable service
- **WHEN** a strict context throws while probing an undeclared service
- **THEN** detection SHALL contain that probe failure and continue evaluating supported declared capabilities without leaking the context

### Requirement: Per-tag isolated package verification
Each registry-reproducible tag SHALL be verified in an isolated fixture containing only the tag's exact required providers and the shared plugin tarball, with no shared `node_modules`, Harness runtime state, credentials, or local source links.

#### Scenario: Fixture contains a mixed Harness release
- **WHEN** resolved direct or relevant transitive DSH packages do not belong to the target release
- **THEN** the fixture SHALL fail before claiming package compatibility

### Requirement: Build and package gates
The verification workflow SHALL run repository checks, tests, production build, Client bundle-boundary inspection, compatibility-catalog validation, generated-report drift checking, boot-graph checks, package-content checks, and same-tarball matrix verification before a tag can receive `packageVerification: passed`.

#### Scenario: Version-specific Harness import remains in the Client bundle
- **WHEN** bundle inspection finds a runtime import of a Harness provider or a tag-specific production branch
- **THEN** the verification workflow SHALL fail

#### Scenario: Package contains local verification material
- **WHEN** the tarball contains a Harness checkout, fixture, credential, cache, local link, `node_modules`, or temporary artifact
- **THEN** package verification SHALL fail

### Requirement: Live smoke remains explicit and secret-safe
Live smoke SHALL be run only when a valid user-provided Web profile and credentials already exist, SHALL cover Host and Client load, settings-card registration, credential status and write behavior, and a representative `ima_ask` flow, and SHALL never print or persist credential literals.

#### Scenario: No valid profile is available
- **WHEN** package verification passes but no suitable live environment is available
- **THEN** `liveSmoke` SHALL be `not-run` with the reason recorded and SHALL NOT be represented as passed

### Requirement: Unsupported and unavailable releases are not overstated
A tag SHALL enter the formal support range only when immutable identity, interface audit, exact provider availability, boot graph, same-tarball package verification, and required repository gates pass; exclusions and unavailable layers SHALL remain visible in generated documentation.

#### Scenario: Alpha release has source but no npm providers
- **WHEN** an alpha tag is source-audited but cannot be reproduced from the registry
- **THEN** generated documentation SHALL label it source-audited only and exclude it from the formally supported installable range

