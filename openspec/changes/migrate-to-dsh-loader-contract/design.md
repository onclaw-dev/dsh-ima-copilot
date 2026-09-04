## Context

The Host currently imports DSH tools, credentials, settings, Cordis, and Schemastery packages at exact Harness versions. The Client reads `connection.api.credentials` and contributes to `settings.plugin.item`. dsh-loader 1.3.4 already provides Host services, settings, Web routing, `defineTool`, and `credentialRef`, but it does not provide a Client credentials API. The loader is an external dependency and is not modified by this change.

## Goals / Non-Goals

**Goals:**

- Remove direct Harness npm and runtime imports.
- Preserve the existing three credential references and per-operation resolution.
- Keep credential values write-only in the browser.
- Provide a standalone IMA settings page across the verified Harness lines.
- Decouple plugin versioning from Harness releases.

**Non-Goals:**

- Modify or publish dsh-loader.
- Change the IMA Web protocol or credential storage format.
- Publish the plugin, create a Git tag, or mutate remote repositories.

## Decisions

1. Host code uses local structural types and `ctx.dshLoader`. This avoids both runtime imports and declaration-merging dependencies on Harness packages.
2. Client credentials use a plugin-owned `POST /api/ima-copilot/credentials/*` bridge. The Host implementation resolves the existing credentials service through dsh-loader, so the browser no longer depends on either legacy `connection.api` or newer Typert Remote shapes.
3. The bridge accepts only fixed operations and fixed IMA references. It validates Host/Origin/Sec-Fetch-Site, bounds JSON bodies, marks responses `no-store`, never offers secret reads, and returns generic write failures.
4. The UI registers in `settings.section`. This slot is present in both inspected `0.1.1-rc.2` and `0.1.2-alpha.2` UI settings contracts. Client composition uses dsh-loader's `ui-settings` and `ui-slots` stable subpaths; its adapter owns the mapping to version-specific modules.
5. The first independent release is `0.2.0`, which is above all previously published versions and communicates the integration-contract change.

## Risks / Trade-offs

- [Risk] A custom HTTP bridge bypasses the standard credentials Remote transport. → Mitigation: expose only describe and set for three constants, copy the established trusted-host fence, and never return secret values.
- [Risk] `ctx.dshLoader.services.get()` can run before asynchronous services exist. → Mitigation: register tool/settings behavior inside nested Cordis service scopes and fail with a clear 503 at the HTTP boundary.
- [Risk] A future Harness release renames or reshapes Client UI modules. → Mitigation: the manifest names only loader stable subpaths, so compatibility changes stay inside the loader adapter.
- [Risk] A batch containing several credential writes can partially commit. → Mitigation: preserve the prior sequential-write semantics and refresh status after completion; credentials provider has no transaction API.

## Migration Plan

1. Add structural loader contracts and the restricted Host credentials API.
2. Move Host registration and runtime credential resolution to dsh-loader.
3. Move the Client page to `settings.section` and switch its transport to fetch.
4. Replace dependencies, version metadata, documentation, and tests.
5. Run clean install, checks, tests, build, package audit, and dependency-purity checks.
6. Publishing remains a separately authorized operation. Rollback is installation of the previous npm version; stored credential references are unchanged.

## Open Questions

None.
