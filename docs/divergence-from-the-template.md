# Divergence from the Template

The upstream [nuxt-ui-templates/docs](https://github.com/nuxt-ui-templates/docs) template is a
minimal docs scaffold: a few demo content sections, a single CI workflow, no deployment or
release tooling. This project layers a full production + GitHub Pages pipeline on top.

This file records what was changed and why, so that a template update can be assessed against a
list of deliberate differences rather than rediscovered from a diff. Decisions that are not about
the template belong in [architecture-decision-record.md](architecture-decision-record.md); the
stack itself is described in [architecture.md](architecture.md).

## SEO / discoverability stack (added modules)

- Added `@nuxtjs/sitemap`, `@nuxtjs/robots`, and `@nuxt/fonts` to `nuxt.config.ts`.
- Sitemap entries come from `defineSitemapSchema()` on both collections in
  [content.config.ts](../content.config.ts) — `@nuxtjs/sitemap` discovers Content v3
  collections natively. This replaced a hand-rolled `server/api/__sitemap__/urls.ts`
  endpoint wired via `sitemap.sources` (dropped in `28f5a1a9`), which also emitted a
  dead `/meetup-groups/meetup.com` URL and omitted `/changelog`; auto-discovery lists
  only rendered pages.
  - Auto-discovery is why `@nuxt/content` is registered **after** `@nuxtjs/sitemap` in
    `modules` — the comment on that line is load-order-significant, not cosmetic.
- `site` block + `runtimeConfig.public.siteUrl`; custom static landing OG image
  (`public/images/og.png`) alongside the ejected `Docs` community OG template.

## Toolchain & dependency management (net-new)

- [mise](https://mise.jdx.dev) (`mise.toml` + `mise.lock`) pins Node/pnpm and acts
  as the task runner (`mise run ci/dev/build`), wrapping the npm scripts.
- Renovate (`renovate.json`, grouped "all" updates, 14-day min age) +
  `renovate-mise-lock.yml` to keep the mise lock in sync.
- `pnpm-workspace.yaml` with explicit `allowBuilds` (notably `better-sqlite3`,
  `sharp`); `better-sqlite3` added as a direct dependency. Matches the template
  except for the `better-sqlite3` entry, which the template no longer needs since
  it moved to the `native` sqlite connector.
- **No `shamefullyHoist`; declare every package you import** (`220a36fa`,
  `08d20924`). It was carried from the pre-Nuxt-4 `.npmrc` purely to let undeclared
  transitive imports resolve. Flattening every transitive dependency into the root
  means the version you compile against is whatever hoist order happened to lift,
  and that is not a theoretical concern here: it caused a full-site outage once (an
  h3 v2 RC hoisted to the root, `@nuxt/content` picked it up, every content query
  threw and every page 404'd — see `790d3661`), and separately a stale local
  `node_modules` was observed resolving a different major of `h3` than a clean
  `pnpm install --frozen-lockfile` did, breaking `typecheck` locally while CI stayed
  green. With every package we import now declared, the flat root is unnecessary,
  and a strict tree means an undeclared import fails at build time rather than
  silently resolving to whatever hoist order picked.

  Adding a hoist back is therefore **not** the fix for an unresolved import —
  declaring the dependency is. Where a *module* rather than our own code needs a
  package resolvable from the app root, that is a different problem; see the
  `@nuxtjs/mdc` entry below.
- Trimmed the template's explicit deps that this site genuinely does not use:
  `unist-util-visit` (unimported in the template too), and
  `simple-icons`/`vscode-icons` (every `i-simple-icons-*` was swapped for
  `i-lucide-*`, so only `@iconify-json/lucide` is needed).
- `@nuxtjs/mdc` was trimmed on the same grounds and has been **restored to the
  template's `^0.23.0`**, because it is unimported but not idle: the module registers
  ten `@nuxtjs/mdc > <pkg>` entries in `vite.optimizeDeps.include`, and Vite resolves
  the left-hand side from the project root. Here the package arrives only through
  `@nuxt/content`, so without the declaration all ten fail and every dev run reports
  `NUXT_B7002` — which `shamefullyHoist` had been masking. Declaring it is how the
  template keeps them resolvable, and matching the template is the point: a
  one-package `publicHoistPattern` also worked and was dropped in favour of this.
  The cost is a known wart rather than a bug: `@nuxt/content` requires `^0.22.2`,
  which `^0.23.0` does not satisfy, so the tree holds two copies and Vite
  pre-bundles against the one that does not run.

  ```
  @nuxtjs/mdc@0.22.2   ← what @nuxt/content actually loads
  @nuxtjs/mdc@0.23.1   ← our declaration, linked at the root, what Vite resolves
  ```

  That is harmless while both agree on the ten packages being pre-bundled, and
  today they agree exactly — `remark-gfm ^4.0.1`, `remark-mdc ^3.11.1`,
  `parse5 ^8.0.1` and the rest are identical in both. It is also the one package
  declared without being imported, which cuts against the trimming of unused
  template deps above; it does not weaken the rule, which is about not *omitting*
  what you import.

  **Watch for** those transitive ranges diverging, which is what would turn the
  wart into a real bug; a Renovate bump on either side is the likely trigger:

  ```bash
  for v in 0.22.2 0.23.1; do npm view @nuxtjs/mdc@$v dependencies --json; done
  ```

  **Retires when** `@nuxt/content`'s range admits the version declared here,
  collapsing the tree to one copy and making this an ordinary dependency. Check
  with `npm view @nuxt/content dependencies.@nuxtjs/mdc`, then confirm with
  `ls -d node_modules/.pnpm/@nuxtjs+mdc@* | wc -l` returning 1.
- `@vueuse/core`, `minimark`, `tailwindcss` and `ufo` were trimmed too, and have
  been restored as direct dependencies. They are imported directly by our own
  code — `@vueuse/core` in `app/components/PageHeaderLinks.vue`, `minimark` and
  `ufo` in `server/routes/raw/[...slug].md.get.ts`, `tailwindcss` in
  `app/assets/css/main.css` — so leaving them undeclared meant the versions we
  compiled against were whatever `shamefullyHoist` happened to lift to the root,
  with nothing pinning them. That is not merely theoretical: `@vueuse/core` still
  resolves to two versions in the tree (10.x transitively, 14.x for us), and a
  stale local `node_modules` was observed hoisting a different major of `h3` than
  a clean `pnpm install --frozen-lockfile` did, which broke `typecheck` locally
  while CI stayed green. Import it, declare it. Declaring these four is what made
  dropping `shamefullyHoist` possible.

## Other `nuxt.config.ts` tweaks

- `vite.build.chunkSizeWarningLimit: 700` + `optimizeDeps.include` for the
  devtools/vueuse chunks.
- `llms.sections` rewritten from the 2 demo sections to the 8 real sections;
  `mcp.name` set to the site title.
- Dropped the template's `content.experimental.sqliteConnector`, leaving it unset.
  `@nuxt/content` defaults to `better-sqlite3` and switches to `sqlite3` by itself in a
  WebContainer, so pinning either would override a choice upstream already makes correctly —
  and stop tracking it if their recommendation changes. This is why `better-sqlite3` is a
  direct dependency here and not in the template, which moved to `native`. The comment at
  the setting in [nuxt.config.ts](../nuxt.config.ts) records why `native` is tempting and what
  would have to change to adopt it; the evidence is in
  [setup-development-environment.md](setup-development-environment.md#stackblitz-does-not-currently-work).
- [content.config.ts](../content.config.ts) keeps the template's two collections and
  their sources, and adds two schema entries: `sitemap` (see above) and the optional
  `links` array that content frontmatter uses.

## Content, components & docs

- Content fully replaced: the template's demo docs → the 8 hiking sections.
- Custom content components: `WeatherLocation`, `FacebookGroupLinks`,
  `SafetyWarnings`, `HeroBackground`, `StarsBg`; added `pages/changelog.vue`.
  The template's `AppHeader/Footer/Logo`, `TemplateMenu`, `PageHeaderLinks`, and
  dynamic `[...slug].vue` routing are kept.
- Added [architecture-decision-record.md](architecture-decision-record.md).

## Licence: CC BY-SA 4.0, not the template's MIT or the org's Apache 2.0

The substance of this repository is *content* — hiking information written in Markdown —
with a comparatively small amount of code to present it. Two other conventions were in
play: the sibling iglootools projects (nbkp, photree) ship Apache 2.0, and the
[Nuxt UI Docs template](https://docs-template.nuxt.dev/) adopted in `db08e2c5` is MIT.

[CC BY-SA 4.0](../LICENSE) was chosen at the initial commit (`8f3d6276`, 2022-10-18) and
deliberately left unchanged when the site was rebuilt on the MIT-licensed template:

- A content licence fits a content project. Apache 2.0 addresses patent grants and code
  copyright, which do not map onto prose.
- Share-alike keeps derived versions of the hiking information open, which is the point
  of publishing it.
- Taking the template's MIT would have relicensed the content as a side effect of
  changing the presentation layer.

So this repository does not match the Apache 2.0 convention of nbkp and photree, and that
is deliberate rather than an oversight. Contributions are accepted under CC BY-SA 4.0, and
any code lifted out of here for reuse in an Apache-licensed project needs an explicit
relicence of that code.
