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
- `@nuxtjs/mdc` was trimmed on the same grounds and has been **restored, as the
  template declares it**, because it is unimported but not idle: the module registers
  ten `@nuxtjs/mdc > <pkg>` entries in `vite.optimizeDeps.include`, and Vite resolves
  the left-hand side from the project root. Here the package arrives only through
  `@nuxt/content`, so without the declaration all ten fail and every dev run reports
  `NUXT_B7002` — which `shamefullyHoist` had been masking. Declaring it is how the
  template keeps them resolvable, and matching the template is the point: a
  one-package `publicHoistPattern` also worked and was dropped in favour of this.
  It is the one package declared without being imported, which cuts against the
  trimming of unused template deps above; it does not weaken the rule, which is
  about not *omitting* what you import.

  It is now an ordinary dependency: a single copy in the tree, the one
  `@nuxt/content` loads and Vite pre-bundles. For its first two months it was not.
  `@nuxt/content` 3.15 required `^0.22.2`, which the declared `^0.23.0` did not
  satisfy, so the tree held two copies and Vite pre-bundled against the one that did
  not run — harmless only because both versions pinned identical ranges for the ten
  pre-bundled packages. `@nuxt/content` 3.16.1 widened its range to `^0.23.1`, which
  collapsed the two (#212), exactly as this entry had predicted it would retire.

  **Watch for** the split coming back: a Renovate bump that takes our declaration
  past a minor `@nuxt/content` has not adopted yet, which in 0.x is any minor. The
  signal is more than one line from:

  ```bash
  ls -d node_modules/.pnpm/@nuxtjs+mdc@*
  ```

  If it happens, compare the two versions' `dependencies` with `npm view`; the split is
  tolerable only while they agree on the pre-bundled packages.
- `@vueuse/core`, `minimark`, `tailwindcss` and `ufo` were trimmed too, and have
  been restored as direct dependencies. They are imported directly by our own
  code — `@vueuse/core` in `app/components/PageHeaderLinks.vue`, `minimark` and
  `ufo` in `server/routes/raw/[...slug].md.get.ts`, `tailwindcss` in
  `app/assets/css/main.css` — so leaving them undeclared meant the versions we
  compiled against were whatever `shamefullyHoist` happened to lift to the root,
  with nothing pinning them. That is not merely theoretical: `@vueuse/core` still
  resolves to three versions in the tree (10.x transitively, 14.x for `@nuxt/ui`,
  15.x for us), and a
  stale local `node_modules` was observed hoisting a different major of `h3` than
  a clean `pnpm install --frozen-lockfile` did, which broke `typecheck` locally
  while CI stayed green. Import it, declare it. Declaring these four is what made
  dropping `shamefullyHoist` possible.

- **`minimark` is on `^1.0.0`; the template and `@nuxt/content` are on `^0.2.0`.**
  Nobody chose this. It was declared at the template's `^0.2.0` and went to 1.0 in a
  grouped Renovate update (#170), which is why it was undocumented until now. It
  matters more than a version number usually does, because the version is the whole
  output of `/raw/*.md` — what the page header's Markdown links serve and what the MCP
  `get-page` tool returns — and the two majors render this site's content very differently.
  `@nuxt/content` builds the AST with 0.2 and we stringify it with 1.0, so this is also
  the one place where two majors of a package meet.

  Measured by stringifying every page body in the content database with each version
  (103 entries; the 7 `.navigation` entries fail in both and are never served; 13
  pages are identical, 90 differ):

  | | 0.2 | 1.0 |
  |---|---|---|
  | Tables (2 pages) | raw `<table>` HTML | Markdown tables |
  | Link `title`s | dropped | kept (2,912) |
  | Components such as `<weather-location>` | stray blank lines, closing tag on its own | closed inline |
  | Array/object props (`:extra-webcams`, 34) | kept as a `:` binding | `:` dropped, so a JSON value reads as a string |
  | External links | plain `[text](url)` | `{rel="[\"nofollow\"]"}` on every one — 7,919 on 60 pages |
  | Total size | 0.92 MB | 1.19 MB (+30%) |

  Neither is clean. 1.0 is more faithful about structure, and 0.2 is far quieter about
  links. The `rel` attribute is not even well-formed — it is the JSON of an array
  wrapped in quotes — and it repeats on almost every line of the trip report pages,
  which are most of the site by volume. It is kept for now because the structural
  losses in 0.2 are information a reader cannot recover, while the `rel` noise is
  redundant.

  **Revisit if** a later `minimark` serialises `rel` properly or omits it, or if the
  noise is worth dropping in our route instead: deleting `rel` from link props before
  `stringify` in
  [server/routes/raw/\[...slug\].md.get.ts](../server/routes/raw/[...slug].md.get.ts)
  would keep 1.0's structure without it. **Retires when** `@nuxt/content` and the
  template move to `minimark` 1.x, at which point this is no longer a divergence.

- `@types/node` is declared, though nothing imports it by name. The trip report
  index scripts (see
  [ADR-005](architecture-decision-record.md#adr-005--generate-the-by-objective-trip-report-index-into-markdown-and-match-objective-names-exactly))
  are Node programs type-checked by `tsc -p scripts/tsconfig.json`, which needs
  Node's globals. It arrives transitively through `nuxt`, and relying on that is
  the pattern this project stopped relying on when `shamefullyHoist` went; the
  declaration pins it instead. This is the second package declared without an
  import, alongside `@nuxtjs/mdc` above, and for the same class of reason —
  something other than our own `import` statements resolves it from the root.

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
