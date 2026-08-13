# Architecture

This site is a [Nuxt](https://nuxt.com/) application built on
[Nuxt UI](https://ui.nuxt.com/) and the
[Nuxt UI Docs template](https://docs-template.nuxt.dev/), with content authored
in Markdown via [Nuxt Content](https://content.nuxt.com/) and
[Nuxt MDC](https://github.com/nuxt-content/mdc).

For the log of significant decisions, see
[architecture-decision-record.md](architecture-decision-record.md).

## Built with

- [Nuxt UI](https://ui.nuxt.com/)
- [Nuxt UI Docs Template](https://docs-template.nuxt.dev/)
- [Nuxt MDC](https://github.com/nuxt-content/mdc)
- Icons via [Iconify](https://iconify.design/) (browse at
  [icones.js.org](https://icones.js.org/))

## Initial project setup

The project was bootstrapped with:

```bash
npm create nuxt@latest -- -t github:nuxt-ui-templates/docs
```

With the following parameters:

- Package Manager: `pnpm`
- Additional Nuxt modules:
  - Nuxt Devtools (enabled in dev only)
  - [@nuxt/hints](https://nuxt.com/modules/hints)
  - [@nuxtjs/sitemap](https://nuxtseo.com/docs/sitemap/guides/content)

## Divergence from the template

The upstream [nuxt-ui-templates/docs](https://github.com/nuxt-ui-templates/docs)
template is a minimal docs scaffold (a few demo content sections, a single CI
workflow, no deployment or release tooling). This project layers a full
production + GitHub Pages pipeline on top. The major additions and changes:

### Deployment & release pipeline (none of this exists in the template)

- GitHub Pages deploy: `build:pages` script (`nuxt build --preset github_pages`)
  plus the `publish.yml` and `release.yml` workflows (template ships only `ci.yml`).
- [semantic-release](https://github.com/semantic-release/semantic-release)
  (`.releaserc.json` + `@semantic-release/*` devDeps) cuts version tags off `main`,
  which trigger the publish workflow.
- `dist` symlink → `.output/public` for the static bundle.

### SEO / discoverability stack (added modules)

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

### Toolchain & dependency management (net-new)

- [mise](https://mise.jdx.dev) (`mise.toml` + `mise.lock`) pins Node/pnpm and acts
  as the task runner (`mise run ci/dev/build`), wrapping the npm scripts.
- Renovate (`renovate.json`, grouped "all" updates, 14-day min age) +
  `renovate-mise-lock.yml` to keep the mise lock in sync.
- `pnpm-workspace.yaml` with explicit `allowBuilds` (notably `better-sqlite3`,
  `sharp`); `better-sqlite3` added as a direct dependency. Matches the template
  except for the `better-sqlite3` entry, which the template no longer needs since
  it moved to the `native` sqlite connector.
- No `shamefullyHoist`. It was carried from the pre-Nuxt-4 `.npmrc` purely to let
  undeclared transitive imports resolve, and it caused a full-site outage once
  (an h3 v2 RC hoisted to the root, `@nuxt/content` picked it up, every content
  query threw and every page 404'd — see `790d3661`). With every package we import
  now declared, the flat root is unnecessary, and a strict tree means an
  undeclared import fails at build time rather than silently resolving to
  whatever hoist order picked.
- Trimmed the template's explicit deps that this site genuinely does not use:
  `@nuxtjs/mdc` and `unist-util-visit` (unimported in the template too), and
  `simple-icons`/`vscode-icons` (every `i-simple-icons-*` was swapped for
  `i-lucide-*`, so only `@iconify-json/lucide` is needed).
  - `@nuxtjs/mdc` is unimported but not idle: the module registers ten
    `@nuxtjs/mdc > <pkg>` entries in `vite.optimizeDeps.include`, and Vite resolves
    the left-hand side from the project root. Declaring it is how the template keeps
    those resolvable. Here it arrives only through `@nuxt/content`, so a one-package
    `publicHoistPattern` in [pnpm-workspace.yaml](../pnpm-workspace.yaml) does that
    job instead — see [the deviation](guidelines.md#nuxtjsmdc-is-hoisted-rather-than-declared)
    for why, and for what would retire it in favour of the template's approach.
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

### Other `nuxt.config.ts` tweaks

- `vite.build.chunkSizeWarningLimit: 700` + `optimizeDeps.include` for the
  devtools/vueuse chunks.
- `llms.sections` rewritten from the 2 demo sections to the 8 real sections;
  `mcp.name` set to the site title; dropped the template's experimental SQLite flag.
- [content.config.ts](../content.config.ts) keeps the template's two collections and
  their sources, and adds two schema entries: `sitemap` (see above) and the optional
  `links` array that content frontmatter uses.

### Content, components & docs

- Content fully replaced: the template's demo docs → the 8 hiking sections.
- Custom content components: `WeatherLocation`, `FacebookGroupLinks`,
  `SafetyWarnings`, `HeroBackground`, `StarsBg`; added `pages/changelog.vue`.
  The template's `AppHeader/Footer/Logo`, `TemplateMenu`, `PageHeaderLinks`, and
  dynamic `[...slug].vue` routing are kept.
- Added [architecture-decision-record.md](architecture-decision-record.md);
  license changed from the template's MIT to CC BY-SA 4.0 (this is content, not code).
