# Architecture Decision Record

This file logs the explicit architectural decisions taken on this project. Decisions are appended over time, newest at the bottom, and are not edited retroactively — if a decision is revisited, a new entry is added that supersedes the previous one.

ADR-002 to ADR-008 were written up together on 2026-08-13, having previously lived in
[guidelines.md](guidelines.md) as "deviations". Most were not deviations from the shared
[common guidelines](https://github.com/iglootools/common-guidelines) at all — they are decisions
about Nuxt, this app's dependency tree, and how far to follow the upstream template, which is
what this file is for. Their `Date` is when the decision was taken, and `Recorded` when it was
logged here, so they are ordered by decision date among themselves rather than after ADR-001.
Only genuine deviations from the shared guidelines remain in `guidelines.md`.

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

## ADR-002 — License under CC BY-SA 4.0, not the template's MIT or the org's Apache 2.0

**Date:** 2022-10-18 (`8f3d6276`)
**Recorded:** 2026-08-13, moved from `guidelines.md`
**Status:** Accepted

### Context

The substance of this repository is *content* — hiking information written in Markdown — with a
comparatively small amount of code to present it. Two other conventions were in play: the sibling
iglootools projects (nbkp, photree) ship Apache 2.0, and the [Nuxt UI Docs
template](https://docs-template.nuxt.dev/) adopted in `db08e2c5` is MIT.

### Decision

[CC BY-SA 4.0](../LICENSE), chosen at the initial commit and deliberately left unchanged when the
site was rebuilt on the MIT-licensed template.

### Rationale

- A content licence fits a content project. Apache 2.0 addresses patent grants and code
  copyright, which do not map onto prose.
- Share-alike keeps derived versions of the hiking information open, which is the point of
  publishing it.
- Taking the template's MIT would have relicensed the content as a side effect of changing the
  presentation layer.

### Consequences

- This repository does not match the Apache 2.0 convention of nbkp and photree. That is
  deliberate, not an oversight.
- Contributions are accepted under CC BY-SA 4.0.
- Any code lifted out of here for reuse in an Apache-licensed project needs an explicit
  relicence of that code.

---

## ADR-003 — Bundle icons at build time, extending the icon scan rather than replacing its globs

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

## ADR-004 — Let the dev container run ahead of the CI runner

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

---

## ADR-005 — No `shamefullyHoist`: declare every package you import

**Date:** 2026-08-07 (`220a36fa`, `08d20924`)
**Recorded:** 2026-08-13, moved from `guidelines.md`
**Status:** Accepted

### Context

`shamefullyHoist` was carried over from the pre-Nuxt-4 `.npmrc` purely so undeclared transitive
imports would resolve. It flattens every transitive dependency into the root `node_modules`,
which means the version you compile against is whatever hoist order happened to lift.

That is not a theoretical concern here. It caused a full-site outage once: an h3 v2 RC hoisted to
the root, `@nuxt/content` picked it up, every content query threw, and every page 404'd
(`790d3661`). Separately, a stale local `node_modules` was observed resolving a different major of
`h3` than a clean `pnpm install --frozen-lockfile` did, breaking `typecheck` locally while CI
stayed green.

### Decision

No `shamefullyHoist`. Every package this app imports is declared in
[package.json](../package.json). Adding a hoist back is not the fix for an unresolved import —
declaring the dependency is.

### Rationale

- With a strict tree, an undeclared import fails at build time instead of silently resolving to
  whatever the layout happened to provide.
- Declaring `@vueuse/core`, `minimark`, `tailwindcss` and `ufo` — all imported by our own code —
  is what made dropping it possible; see
  [architecture.md](architecture.md#toolchain--dependency-management-net-new).

### Consequences

- An import of an undeclared package is a build failure, by design.
- Where a *module* rather than our own code needs a package resolvable from the app root, that is
  a different problem with its own answer — see ADR-008.

---

## ADR-006 — Treat `compatibilityDate` as behaviour, not a version

**Date:** 2026-08-07 (`8542cdb2`)
**Recorded:** 2026-08-13, moved from `guidelines.md`
**Status:** Accepted

### Context

Nuxt's `compatibilityDate` selects which set of framework and Nitro defaults apply. It looks like
a value that wants keeping current, and Renovate-style automation would treat it as one.

### Decision

Raise it deliberately, alongside a build-and-prerender check. Never let it be bumped
automatically, and never treat it as a routine version update.

### Rationale

It changes Nuxt and Nitro *behaviour* rather than a dependency version, so the risk profile is
that of a framework upgrade while the diff looks like a one-line bump.

### Consequences

- Each raise is its own commit with a build and prerender verified against it.
- Automation must not touch it.

---

## ADR-007 — Do not pin what upstream decides per environment

**Date:** 2026-08-07 (`fb0c0e15`)
**Recorded:** 2026-08-13, moved from `guidelines.md`
**Status:** Accepted

### Context

`@nuxt/content` chooses its SQLite connector by environment: `better-sqlite3` by default,
switching to `sqlite3` by itself when it detects a WebContainer. Setting
`content.experimental.sqliteConnector` explicitly is a common suggestion online, and tempting
when debugging environment-specific failures.

### Decision

Where a module already makes an environment-dependent choice correctly, leave it unset. Prefer
`provider` from `std-env` over hand-rolled environment detection, and keep
[nuxt.config.ts](../nuxt.config.ts) free of `if (webcontainer)` branches.

### Rationale

Pinning it overrides a decision upstream is making well, *and* stops tracking that decision if
their recommendation changes — fixing in place something that is currently self-correcting.

### Consequences

- The comment at that setting records why `native` is tempting and what would have to change to
  adopt it; see also
  [setup-development-environment.md](setup-development-environment.md#stackblitz-does-not-currently-work).
- Environment-specific behaviour stays out of the config, which is what keeps the StackBlitz
  findings in that document reproducible.

---

## ADR-008 — Declare `@nuxtjs/mdc` even though nothing imports it, matching the template

**Date:** 2026-08-13 (`de571415`)
**Recorded:** 2026-08-13
**Status:** Accepted — supersedes the `publicHoistPattern` approach of `b35f109c`

### Context

The `@nuxtjs/mdc` module adds ten `@nuxtjs/mdc > <pkg>` entries to `vite.optimizeDeps.include` for
its own transitive deps, and Vite resolves the left-hand side from the project root. The package
reaches this app only through `@nuxt/content`, so under ADR-005's strict tree all ten fail and
every dev run reports `NUXT_B7002`. `shamefullyHoist` had been masking it until `08d20924`.

Two fixes work. The [upstream template](https://github.com/nuxt-ui-templates/docs) declares
`@nuxtjs/mdc` as a direct dependency. `b35f109c` instead used a one-package `publicHoistPattern`,
which links the single instance already in the tree.

### Decision

Declare `@nuxtjs/mdc` in [package.json](../package.json) at the template's `^0.23.0`, and remove
the `publicHoistPattern`.

### Rationale

- Staying close to the template is worth more here than closing a theoretical gap, and it is one
  fewer non-obvious pnpm setting to explain.
- The cost is a known wart rather than a bug: `@nuxt/content` requires `^0.22.2`, which `^0.23.0`
  does not satisfy, so the tree holds two copies and Vite pre-bundles against the one that does
  not run.

  ```
  @nuxtjs/mdc@0.22.2   ← what @nuxt/content actually loads
  @nuxtjs/mdc@0.23.1   ← our declaration, linked at the root, what Vite resolves
  ```

- That is harmless while both agree on the ten packages being pre-bundled, and today they agree
  exactly — `remark-gfm ^4.0.1`, `remark-mdc ^3.11.1`, `parse5 ^8.0.1` and the rest are identical
  in both versions.

### Consequences

- This is the one package declared without being imported, which cuts against the trimming of
  unused template deps recorded in
  [architecture.md](architecture.md#toolchain--dependency-management-net-new). It does not weaken
  ADR-005, which is about not *omitting* what you import.
- **Watch for** those transitive ranges diverging, which is what would turn the wart into a real
  bug; a Renovate bump on either side is the likely trigger. Compare with:

  ```bash
  for v in 0.22.2 0.23.1; do npm view @nuxtjs/mdc@$v dependencies --json; done
  ```

- **Retires when** `@nuxt/content`'s range admits the version declared here, collapsing the tree
  to one copy and making this an ordinary dependency. Check with
  `npm view @nuxt/content dependencies.@nuxtjs/mdc`, then confirm with
  `ls -d node_modules/.pnpm/@nuxtjs+mdc@* | wc -l` returning 1.
