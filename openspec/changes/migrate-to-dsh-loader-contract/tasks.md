## 1. Host migration

- [x] 1.1 Define minimal local dsh-loader, service, and HTTP structural contracts
- [x] 1.2 Route tool registration, settings, and credential resolution through `ctx.dshLoader`
- [x] 1.3 Add the trusted, fixed-reference credential describe/set API

## 2. Client migration

- [x] 2.1 Replace connection credentials Remote calls with the plugin API client
- [x] 2.2 Register IMA Copilot as a standalone `settings.section`
- [x] 2.3 Update the Client bundle externals and composition metadata
- [x] 2.4 Replace real Harness Client manifest names with loader stable UI subpaths

## 3. Package and documentation

- [x] 3.1 Replace direct Harness dependencies with dsh-loader and public Schemastery
- [x] 3.2 Adopt version `0.2.0` and loader-contract metadata
- [x] 3.3 Update README and repository release instructions

## 4. Verification

- [x] 4.1 Update Client tests and add credential API security tests
- [x] 4.2 Run dependency install, typecheck, unit tests, and build
- [x] 4.3 Audit package contents and generated artifacts for direct Harness imports
- [x] 4.4 Validate the OpenSpec change
- [x] 4.5 Enforce the repository-wide loader boundary with an automated check

## 5. Patch release polish

- [x] 5.1 Render the standalone settings form without fold/expand state
- [x] 5.2 Document mandatory manual dsh-loader installation and commands
- [x] 5.3 Prepare patch version `0.2.1` and npm package description
