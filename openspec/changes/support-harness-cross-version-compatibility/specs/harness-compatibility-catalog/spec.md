## ADDED Requirements

### Requirement: Immutable tag identity records
The compatibility catalog SHALL contain one record for every in-scope official `dsh-v*` tag, and each record SHALL bind the tag to its root version, full 40-character commit SHA, official repository, Node engine, development-baseline flag, internal contract, interface family, and adapter.

#### Scenario: Catalog identity is validated
- **WHEN** catalog validation runs
- **THEN** every recorded tag, version, and commit SHALL match the corresponding immutable official Git object and exactly one record SHALL be the development baseline

### Requirement: Complete ordered audit range
The initial catalog SHALL cover official tags from `dsh-v0.1.0-rc.7` through `dsh-v0.1.3-alpha.1` in audited order and SHALL explicitly record `dsh-v0.1.2-alpha.1` as excluded from runtime verification under the existing local environment contract rather than silently omitting it.

#### Scenario: Excluded tag is audited
- **WHEN** validation encounters `dsh-v0.1.2-alpha.1`
- **THEN** it SHALL require immutable source evidence and an exclusion reason while prohibiting a false runtime-verification pass

### Requirement: Plugin-scoped interface evidence
Each tag record SHALL describe changes relative to the previous audited tag only for the Host, Client, loader, slot, provider boot graph, and wire semantics actually consumed by this plugin, including evidence paths and the reason for reusing or changing an interface family.

#### Scenario: Upstream change is unrelated to IMA
- **WHEN** a tag changes Harness code outside the IMA plugin's consumed capabilities without altering their semantics
- **THEN** the tag SHALL retain its existing interface family and the unrelated change SHALL NOT create a new adapter

#### Scenario: Consumed surface changes
- **WHEN** a required method, service location, parameter shape, result shape, loader protocol, slot contract, or error semantic changes
- **THEN** the record SHALL explain the impact and either map the tag to a new interface family or explain how the stable adapter boundary removes the changed surface from consumption

### Requirement: Audited initial interface grouping
The initial audit SHALL represent the legacy Connection family for `dsh-v0.1.0-rc.7` through `dsh-v0.1.1-rc.2`, the initial Gateway family for `dsh-v0.1.2-alpha.1`, and the post-helper-removal Gateway family for `dsh-v0.1.2-alpha.2` through `dsh-v0.1.3-alpha.1`.

#### Scenario: Interface map is generated
- **WHEN** the human-readable audit report is generated from the catalog
- **THEN** all eleven tags SHALL appear once with their immutable commit, family, adapter implementation, and support status

### Requirement: Exact dependency availability
Each tag SHALL record the exact direct provider versions required for that tag and whether the complete set is available from the npm registry; dependency records SHALL reject ranges, dist-tags, branches, Git URLs, local paths, and cross-release version mixing.

#### Scenario: Required provider is unpublished
- **WHEN** any exact provider required for a tag is absent from the registry
- **THEN** the tag's registry and package-verification states SHALL be `unavailable` and SHALL identify the missing public package coordinates

### Requirement: Independent verification states
Each tag SHALL independently record `audited`, `registry`, `packageVerification`, and `liveSmoke` using controlled statuses and a non-empty reason or evidence field, and one layer SHALL NOT be inferred as passed from another layer.

#### Scenario: Source is available but providers are unpublished
- **WHEN** immutable source audit passes for `dsh-v0.1.3-alpha.1` but its required exact providers are unavailable
- **THEN** `audited` MAY be `passed` while `registry` and `packageVerification` remain `unavailable`

### Requirement: Development baseline remains independent
Expanding the compatibility catalog SHALL NOT modify the sole development baseline `dsh-v0.1.1-rc.2` unless a separate explicitly authorized baseline-adoption change satisfies repository upgrade rules.

#### Scenario: Newer audited tag is added
- **WHEN** a newer Harness tag is audited and mapped to an existing or new adapter
- **THEN** `package.json.deepseekHarness` and baseline development dependencies SHALL remain unchanged by that fact alone

