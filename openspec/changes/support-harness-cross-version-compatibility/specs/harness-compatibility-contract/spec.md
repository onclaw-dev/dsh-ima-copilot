## ADDED Requirements

### Requirement: Stable internal plugin contract
The plugin SHALL expose an internal `IMA-BASE-1` contract containing only the Host and Client operations required by IMA business behavior, and business modules SHALL NOT depend on a raw Harness context, Harness tag, interface-family identifier, adapter identifier, provider-specific branded type, or wire response envelope.

#### Scenario: Business operation uses normalized Host capabilities
- **WHEN** the IMA tool resolves credentials, registers its native tool, or observes optional settings
- **THEN** it SHALL invoke `IMA-BASE-1` operations rather than access `ctx.credentials`, `ctx.tools`, or `ctx.settings` directly

#### Scenario: Settings card uses normalized Client capabilities
- **WHEN** the settings card describes or writes an IMA credential
- **THEN** it SHALL receive a normalized credential operation whose input and result do not expose either legacy Connection envelopes or Gateway Remote envelopes

### Requirement: Capability-based interface selection
The Client bootstrap SHALL select a Harness adapter by validating the complete minimum capability set, SHALL prefer the newer Gateway capability shape when more than one supported shape is present, and SHALL NOT use version-string ordering to select behavior.

#### Scenario: Gateway credential surface is available
- **WHEN** `remote.credentials.describe` and `remote.credentials.set` are callable together with the common slot and lifecycle capabilities
- **THEN** bootstrap SHALL construct the Gateway adapter

#### Scenario: Only legacy credential surface is available
- **WHEN** the Gateway capability set is incomplete and `connection.api.credentials.describe` and `connection.api.credentials.set` are callable together with the common capabilities
- **THEN** bootstrap SHALL construct the legacy adapter

#### Scenario: No complete supported surface is available
- **WHEN** neither supported credential surface and the common capability set are complete
- **THEN** bootstrap SHALL fail before registering the settings card and report the missing capabilities and candidate families

### Requirement: Interface-family implementation reuse
Tags with equivalent plugin-consumed behavior SHALL reuse the same adapter implementation, while source-visible interface changes that affect the plugin SHALL remain represented in the compatibility catalog even when a lower common runtime operation permits implementation reuse.

#### Scenario: Alpha Gateway families share normalized behavior
- **WHEN** `dsh-v0.1.2-alpha.1` and an `alpha.2`-or-newer tag expose the same consumed `remote.credentials` operations but differ in Host helper exports or error vocabulary
- **THEN** the catalog SHALL preserve their distinct audited interface families and the implementation MAY reuse the same Gateway Client adapter and common Host adapter

### Requirement: Safe normalized diagnostics
Unsupported-environment and adapter errors SHALL contain only missing capability labels, candidate family labels, optional public runtime identity, and public reasons, and SHALL NOT serialize a raw context, credential value, request header, Remote payload containing secrets, or settings document.

#### Scenario: Adapter detection fails with credentials present elsewhere
- **WHEN** capability detection rejects a context that also contains credential-bearing objects
- **THEN** the resulting error text and enumerable diagnostic fields SHALL contain no credential literal

### Requirement: Preserved IMA behavior
All supported adapters SHALL preserve the baseline semantics of dynamic per-operation credential resolution, settings-driven tool re-registration, credential status description, non-empty credential writes, IMA header normalization, knowledge-base selection, cancellation forwarding, timeout declaration, canonical answer output, and reference rendering.

#### Scenario: Credential is changed without restarting Harness
- **WHEN** an IMA credential is updated and the next `ima_ask` operation starts
- **THEN** the operation SHALL resolve and use the new credential without retaining the prior secret in plugin state

#### Scenario: Settings value changes
- **WHEN** a registered IMA settings scope publishes a changed valid configuration
- **THEN** the existing tool registration SHALL be disposed and replaced exactly once with a definition derived from the new configuration

### Requirement: Version-neutral public declarations
Published declarations SHALL describe plugin-owned structural contracts and SHALL NOT require a version-specific `IApiClient`, `ConnectionHandle`, Harness `Context`, or removed Harness helper export to type-check.

#### Scenario: Consumer inspects the packed declarations
- **WHEN** the package is installed beside any registry-reproducible supported tag
- **THEN** TypeScript SHALL resolve the plugin declarations without installing a different Harness release to satisfy declaration-only imports

