## ADDED Requirements

### Requirement: Loader-mediated Host integration
The plugin SHALL access DSH Host services and module-level DSH helpers only through the public `ctx.dshLoader` contract and SHALL NOT retain real Harness package names in source, generated artifacts, manifests, lockfiles, or documentation.

#### Scenario: Registering the IMA tool
- **WHEN** dsh-loader, tools, and credentials services are available
- **THEN** the plugin registers `ima_ask` through services and helpers obtained from `ctx.dshLoader`

#### Scenario: A dependent service reloads
- **WHEN** a tools, credentials, or settings service is unloaded and later restored
- **THEN** the plugin disposes stale registrations and recreates them through the active loader-backed service scope

### Requirement: Restricted credential settings bridge
The plugin SHALL expose a same-origin Host endpoint that can describe and update only the three IMA-owned credential references, and it MUST NOT return or log stored credential values.

#### Scenario: Describing IMA credentials
- **WHEN** the settings page requests credential status from a trusted same-origin page
- **THEN** the endpoint returns only configured, source, and writable metadata for the fixed IMA references

#### Scenario: Updating IMA credentials
- **WHEN** the settings page submits non-empty values for allowed IMA references
- **THEN** the Host normalizes the values and writes them through the loader-resolved credentials service without echoing them

#### Scenario: Attempting arbitrary credential access
- **WHEN** a request names a credential reference outside the fixed IMA allowlist or originates cross-site
- **THEN** the endpoint rejects the request without touching the credentials service

### Requirement: Standalone IMA settings page
The Client SHALL register IMA configuration as a `settings.section` entry through loader stable UI subpaths and SHALL NOT depend on the Harness connection credentials Remote or real Harness package names.

#### Scenario: Opening settings
- **WHEN** the settings shell declares the `settings.section` slot
- **THEN** an `IMA Copilot` navigation entry renders the write-only credential and knowledge-base form

#### Scenario: Auditing the Client manifest
- **WHEN** the loader-boundary check scans Client composition metadata
- **THEN** all UI dependencies use dsh-loader stable subpaths and no real Harness package name is present

### Requirement: Independent plugin versioning
The plugin SHALL use independent SemVer and SHALL record its adopted dsh-loader contract rather than an exact Harness release.

#### Scenario: Packaging the loader migration
- **WHEN** the migration is packaged
- **THEN** the final package version is `0.2.1`, the default publish tag is `latest`, and the manifest contains no direct Harness npm dependency

### Requirement: Always-expanded standalone settings
The standalone IMA settings section SHALL render its configuration form immediately without a fold or expand control.

#### Scenario: Opening the IMA settings section
- **WHEN** the user selects the `IMA Copilot` settings navigation entry
- **THEN** the complete credential and knowledge-base form is visible without another interaction
