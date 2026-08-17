# Architecture Decision Record

This file logs the explicit architectural decisions taken on this project. Decisions are appended over time, newest at the bottom, and are not edited retroactively — if a decision is revisited, a new entry is added that supersedes the previous one.

ADR-002 and ADR-003 were written up on 2026-08-13, having previously lived in
[guidelines.md](guidelines.md) as "deviations". They were not deviations from the shared
[common guidelines](https://github.com/iglootools/common-guidelines) at all — they are decisions
about Nuxt and this app's environment, which is what this file is for. Their `Date` is when
the decision was taken, and `Recorded` when it was logged here, so they are ordered by decision
date among themselves rather than after ADR-001. Only genuine deviations from the shared
guidelines remain in `guidelines.md`.

The bar for an entry here is that there was a **choice worth arguing**. Where the project simply
does what the template or the framework does, or where a one-line comment at the setting already
carries the reasoning, that is enough — `compatibilityDate` and
`content.experimental.sqliteConnector` are both handled that way, in
[nuxt.config.ts](../nuxt.config.ts).

Decisions about **how far to follow the [upstream
template](https://github.com/nuxt-ui-templates/docs)** are deliberately not here. They are
recorded in
[divergence-from-the-template.md](divergence-from-the-template.md), next to the
description of what this project changed — the licence, dropping `shamefullyHoist`, and
declaring `@nuxtjs/mdc` among them. Splitting the template relationship across two files meant
the same divergence was described twice, in prose there and in ADR form here.

---

## ADR-001 — Use ESLint (not Biome) for linting and formatting

**Date:** 2026-05-19
**Status:** Accepted

### Context

The project needs a linter (and, in time, a formatter) for the TypeScript + Vue + Nuxt codebase. Two realistic options were considered:

- **ESLint** via the first-party [`@nuxt/eslint`](https://eslint.nuxt.com/) module. Nuxt auto-generates a flat config that is aware of pages, layouts, server routes, and the auto-import system, so rules can be tuned against the project's real shape rather than a generic JS/TS baseline.
- **Biome** — a faster, single-binary alternative that bundles linting and formatting. It has no Nuxt-specific integration and no awareness of Nuxt's conventions (auto-imports, virtual modules, etc.).

### Decision

We use **ESLint**, configured through the `@nuxt/eslint` module declared in [nuxt.config.ts](../nuxt.config.ts).

### Rationale

- `@nuxt/eslint` is the officially supported, first-party Nuxt tooling. It tracks the framework's conventions automatically as Nuxt evolves.
- It understands auto-imports, route file conventions, and component discovery, so rules like `no-undef` or `no-unused-vars` behave correctly without manual ignore-lists.
- Choosing Biome would mean either disabling rules that don't understand Nuxt's magic, or layering custom configuration to compensate — losing most of Biome's "zero-config" appeal anyway.
- The performance gap is not a pain point at this codebase's size.

### Consequences

- Linting is run via `pnpm lint` (`eslint .`), wired up in CI through `mise run ci`.
- Any rule customization happens in [eslint.config.mjs](../eslint.config.mjs); stylistic preferences are set under the `eslint.config.stylistic` block in [nuxt.config.ts](../nuxt.config.ts).
- If a future need arises for a dedicated formatter, Prettier is the natural addition; Biome would only be reconsidered if the Nuxt ecosystem ships a first-party Biome integration.

---

## ADR-002 — Bundle icons at build time, extending the icon scan rather than replacing its globs

**Date:** 2026-08-05 (`d7bd7a1d`)
**Recorded:** 2026-08-13, moved from `guidelines.md`
**Status:** Accepted

### Context

Without `icon.clientBundle.scan`, only the icons `@nuxt/ui` registers itself end up in the client
bundle. Every other icon is fetched from `api.iconify.design` at render time, which logs
`[Icon] failed to load icon` for each one and leaves a statically prerendered site dependent on a
third-party host at runtime.

### Decision

Keep `scan: true` in [nuxt.config.ts](../nuxt.config.ts) with the module's **default** globs, and
list icons that only appear in `app.config.ts` explicitly under `clientBundle.icons`.

### Rationale

- Setting `globInclude` to add an extension *replaces* the default globs rather than extending
  them, which pins a copy of upstream's internals that goes stale silently the moment they add
  one.
- The defaults already cover `.vue` and `.md`. The latter matters most here, since most icons are
  declared in content frontmatter rather than in components.
- They skip `.ts`, which is why the `app.config.ts` icons are enumerated by hand.
- That hand-written list is not guaranteed complete by anything, but the failure is loud rather
  than silent: an icon that is neither scanned nor listed warns on every render.

### Consequences

- Adding an icon in a `.ts` file means adding it to `clientBundle.icons` as well.
- Revisit if `@nuxt/icon` extends its default globs to cover `.ts`, at which point the explicit
  list can go.

---

## ADR-003 — Let the dev container run ahead of the CI runner

**Date:** 2026-08-06 (`5a86c97c`)
**Recorded:** 2026-08-13, moved from `guidelines.md`
**Status:** Accepted

### Context

[.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) pins
`base:ubuntu26.04` while CI's `ubuntu-latest` still resolves to 24.04, so the environment
contributors develop in is not the one CI validates against.

### Decision

Accept the divergence rather than pinning the container back to `ubuntu-24.04`.

### Rationale

- The divergence is narrow by design. Everything that determines what the app actually runs on —
  Node, pnpm — comes from `mise.lock` and is identical in both.
- The base image contributes glibc, curl, and the C++ toolchain that compiles `better-sqlite3`,
  and that binary never leaves the container.

### Consequences

- **Retires when** GitHub moves `ubuntu-latest` to 26.04.
- If a native module ever builds in the container but fails in CI, this is the first place to
  look, and pinning back to `ubuntu-24.04` is the fix.
