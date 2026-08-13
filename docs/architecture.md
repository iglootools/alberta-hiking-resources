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
- Legacy URLs redirect to their current pages, from the `legacyRedirects` map at the
  top of [nuxt.config.ts](../nuxt.config.ts). See
  [Redirecting retired URLs](#redirecting-retired-urls) below.

#### Redirecting retired URLs

The site has been restructured twice — the pre-Nuxt-4 `/hiking-groups` and
`/practical-information` sections (`db08e2c5`), plus assorted renames since — and
Google still has the old URLs, which it reports under *Not found (404)*. Each one is
mapped to its successor in `legacyRedirects`.

GitHub Pages serves static files and nothing else, so it cannot answer with a real
`301`. What it can serve is a file, and that is what Nitro generates: listing a
`redirect` route rule in `nitro.prerender.routes` writes an HTML stub containing only
`<meta http-equiv="refresh" content="0; url=…">`, which Google follows and treats as
a redirect. `@nuxtjs/sitemap` recognises exactly that stub (`NuxtRedirectHtmlRegex`)
and leaves it out of `sitemap.xml`, so the retired URLs are never re-advertised.

Two details are easy to get wrong, and both fail silently:

- **Every path needs a file in both forms.** `autoSubfolderIndex: false` means `/a/b`
  is served from `a/b.html` while `/a/b/` needs `a/b/index.html`, and on GitHub Pages
  neither falls back to the other. The old site emitted trailing slashes, so that is
  the form Google actually holds. One *route rule* covers both, because matching is
  trailing-slash-insensitive (see below), but the prerenderer names its output after
  the URL it was asked for — so both forms are listed in `prerender.routes`.
- **The routes must be listed for prerendering.** Nothing links to them, so
  `crawlLinks` alone never reaches them and no file is written.

#### Why five of them are not route rules

`/faq`, `/getting-started`, `/getting-started/contributing`, `/hike-organizers` and
`/hike-organizers/sami` survived the restructure, but the old site served them with a
trailing slash too, and that form 404s. They cannot be fixed with a route rule:
radix3 strips a trailing slash before matching (Nitro leaves `strictTrailingSlash`
unset), so a rule keyed `/faq/` also matches `/faq` and replaces the live page with a
stub pointing at itself. That is not a hypothetical — it happened, and it silently
took five pages out of `sitemap.xml`, which is the check that catches it.

They are written as files instead, in a `prerender:done` hook, after the real pages
have rendered. `public/` would be simpler but risks Nitro's static handler resolving
`/faq` to `faq/index.html` and shadowing the page in dev and during prerender.

Placing `faq/index.html` beside a live `faq.html` is safe **on GitHub Pages**, which
resolves an extensionless request to the matching file and only redirects to the
directory when no such file exists. Verified against the deployed matrix at
[slorber/trailing-slash-guide](https://github.com/slorber/trailing-slash-guide), where
`/both` serves `both.html` with no redirect. Not every host agrees — Python's
`http.server` does the opposite, so `mise run preview`-style local checks will show a
301 here — and on a host that prefers the directory, `/faq` → `/faq/` → `/faq` loops.
Re-run that check before moving off GitHub Pages.

Entries are permanent: a URL only has to have been public once for something to still
link to it. Verify a change by building and checking the stub and its target both
exist — `grep -rl 'http-equiv="refresh"' .output/public`.

**Retires when** the site moves to a host that can issue real HTTP redirects, at which
point the same `routeRules` map serves them directly with no stub files and no
prerender list.

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
