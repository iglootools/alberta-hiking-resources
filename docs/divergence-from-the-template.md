# Divergence from the Template

The upstream [nuxt-ui-templates/docs](https://github.com/nuxt-ui-templates/docs)
template is a minimal docs scaffold: a few demo content sections, a single CI
workflow, no deployment or release tooling. This project layers a full
production + GitHub Pages pipeline on top.

This file records what was changed and why, so that a template update can be
assessed against a list of deliberate differences rather than rediscovered from
a diff. [Template audits](#template-audits) records each time the two were
compared and the template commit to resume from. Decisions that are not about
the template belong in
[architecture-decision-record.md](architecture-decision-record.md); the stack
itself is described in [architecture.md](architecture.md).

<!-- toc -->
**On this page**

- [SEO / discoverability stack (added modules)](#seo--discoverability-stack-added-modules)
- [Toolchain & dependency management (net-new)](#toolchain--dependency-management-net-new)
- [Other `nuxt.config.ts` tweaks](#other-nuxtconfigts-tweaks)
- [Content, components & docs](#content-components--docs)
- [Visual identity](#visual-identity)
- [Licence: CC BY-SA 4.0, not the template's MIT or the org's Apache 2.0](#licence-cc-by-sa-40-not-the-templates-mit-or-the-orgs-apache-20)
- [Template audits](#template-audits)
  - [2026-11-25](#2026-11-25)
<!-- tocstop -->

## SEO / discoverability stack (added modules)

- Added `@nuxtjs/sitemap` and `@nuxtjs/robots` to `nuxt.config.ts`.
  `@nuxt/fonts` was declared and registered too, by `nuxt-og-image`'s v6
  migration tool, until 2026-11-25: `@nuxt/ui` installs and registers it itself,
  as in the template, and a second declaration only had to be held to its range.
- `nuxt-agent-discovery`, as in the template, takes over `/raw/*.md` (below) and
  adds `.md` twins of every page, `/sitemap.md`, an `Overview` entry in
  `llms.txt`, and an AI section in `robots.txt`. That section names 26 AI
  crawlers with `Allow: /`, which the wildcard group already allowed, and adds
  `Content-Signal: search=yes, ai-train=yes, ai-input=yes`, the module's default
  and a statement of policy the site did not make before. Its other features
  need a server and are inert on GitHub Pages: content negotiation on
  `Accept: text/markdown` or an agent's User-Agent, the discovery `Link` header,
  Markdown error bodies, and `/.well-known/api-catalog`, which the static build
  does not emit. `/sitemap.md` still tells agents they can send
  `Accept: text/markdown`, which is not true here.
- Sitemap entries come from `defineSitemapSchema()` on both collections in
  [content.config.ts](../content.config.ts) — `@nuxtjs/sitemap` discovers
  Content v3 collections natively. This replaced a hand-rolled
  `server/api/__sitemap__/urls.ts` endpoint wired via `sitemap.sources` (dropped
  in `28f5a1a9`), which also emitted a dead `/meetup-groups/meetup.com` URL and
  omitted `/changelog`; auto-discovery lists only rendered pages.
  - Auto-discovery is why `@nuxt/content` is registered **after**
    `@nuxtjs/sitemap` in `modules` — the comment on that line is
    load-order-significant, not cosmetic.
- `site` block + `runtimeConfig.public.siteUrl`; custom static landing OG image
  (`public/images/og.png`) alongside the ejected `Docs` community OG template.

## Toolchain & dependency management (net-new)

- The template's single `ci.yml` is replaced by `preflight.yml` (every lint and
  test, through mise), `release.yml` (semantic-release, which is also why its
  plugins are devDependencies) and `publish.yml` (the GitHub Pages deploy), plus
  `renovate-mise-lock.yml` below. Its Node version therefore comes from
  `mise.toml`, not from the workflow.
- [mise](https://mise.jdx.dev) (`mise.toml` + `mise.lock`) pins Node/pnpm and
  acts as the task runner (`mise run ci-preflight/dev/build`), wrapping the npm
  scripts.
- Renovate (`renovate.json`, grouped "all" updates, 14-day min age) +
  `renovate-mise-lock.yml` to keep the mise lock in sync.
- `pnpm-workspace.yaml` with explicit `allowBuilds` (notably `better-sqlite3`,
  `sharp`); `better-sqlite3` added as a direct dependency. Matches the template
  except for the `better-sqlite3` entry, which the template no longer needs
  since it moved to the `native` sqlite connector. The template's
  `minimumReleaseAgeExclude: ['@nuxt/ui']` has no counterpart: the release-age
  hold lives in Renovate, as [guidelines.md](guidelines.md) describes, not in
  pnpm. The `overrides` there are this site's own, each explained in place.
- **No `shamefullyHoist`; declare every package you import** (`220a36fa`,
  `08d20924`). It was carried from the pre-Nuxt-4 `.npmrc` purely to let
  undeclared transitive imports resolve. Flattening every transitive dependency
  into the root means the version you compile against is whatever hoist order
  happened to lift, and that is not a theoretical concern here: it caused a
  full-site outage once (an h3 v2 RC hoisted to the root, `@nuxt/content` picked
  it up, every content query threw and every page 404'd — see `790d3661`), and
  separately a stale local `node_modules` was observed resolving a different
  major of `h3` than a clean `pnpm install --frozen-lockfile` did, breaking
  `typecheck` locally while CI stayed green. With every package we import now
  declared, the flat root is unnecessary, and a strict tree means an undeclared
  import fails at build time rather than silently resolving to whatever hoist
  order picked.

  Adding a hoist back is therefore **not** the fix for an unresolved import —
  declaring the dependency is. Where a *module* rather than our own code needs a
  package resolvable from the app root, that is a different problem; see the
  `@nuxtjs/mdc` entry below.
- Trimmed the template's explicit deps that this site genuinely does not use:
  `unist-util-visit` (unimported in the template too), and
  `simple-icons`/`vscode-icons` (every `i-simple-icons-*` was swapped for
  `i-lucide-*`, so only `@iconify-json/lucide` is needed).
- `@nuxtjs/mdc` was trimmed on the same grounds and has been
  **restored, as the template declares it**, because it is unimported but not
  idle: the module registers ten `@nuxtjs/mdc > <pkg>` entries in
  `vite.optimizeDeps.include`, and Vite resolves the left-hand side from the
  project root. Here the package arrives only through `@nuxt/content`, so
  without the declaration all ten fail and every dev run reports `NUXT_B7002` —
  which `shamefullyHoist` had been masking. Declaring it is how the template
  keeps them resolvable, and matching the template is the point: a one-package
  `publicHoistPattern` also worked and was dropped in favour of this. It is the
  one package declared without being imported, which cuts against the trimming
  of unused template deps above; it does not weaken the rule, which is about not
  *omitting* what you import.

  It is now an ordinary dependency: a single copy in the tree, the one
  `@nuxt/content` loads and Vite pre-bundles. For its first two months it was
  not. `@nuxt/content` 3.15 required `^0.22.2`, which the declared `^0.23.0` did
  not satisfy, so the tree held two copies and Vite pre-bundled against the one
  that did not run — harmless only because both versions pinned identical ranges
  for the ten pre-bundled packages. `@nuxt/content` 3.16.1 widened its range to
  `^0.23.1`, which collapsed the two (#212), exactly as this entry had predicted
  it would retire.

  **Watch for** the split coming back: a Renovate bump that takes our
  declaration past a minor `@nuxt/content` has not adopted yet, which in 0.x is
  any minor. The signal is more than one line from:

  ```bash
  ls -d node_modules/.pnpm/@nuxtjs+mdc@*
  ```

  If it happens, compare the two versions' `dependencies` with `npm view`; the
  split is tolerable only while they agree on the pre-bundled packages.
- `@vueuse/core`, `tailwindcss` and `ufo` were trimmed too, and have been
  restored as direct dependencies. They are imported directly by our own code —
  `@vueuse/core` in `app/components/PageHeaderLinks.vue`, `ufo` there and in
  `app/pages/[...slug].vue`, `tailwindcss` in `app/assets/css/main.css` — so
  leaving them undeclared meant the versions we
  compiled against were whatever `shamefullyHoist` happened to lift to the root,
  with nothing pinning them. That is not merely theoretical: `@vueuse/core`
  still resolves to three versions in the tree (10.x transitively, 14.x for
  `@nuxt/ui`, 15.x for us), and a stale local `node_modules` was observed
  hoisting a different major of `h3` than a clean
  `pnpm install --frozen-lockfile` did, which broke `typecheck` locally while CI
  stayed green. Import it, declare it. Declaring them, and `minimark` while our
  `/raw` route imported it (below), is what made dropping `shamefullyHoist`
  possible.
- **`/raw/*.md` is left to the modules, as in the template; our own route and
  `minimark` are gone.** The site carried
  `server/routes/raw/[...slug].md.get.ts`, a copy of the template's, with
  `minimark` declared at `^1.0.0` to stringify it, and this entry recorded why
  1.0 was preferred to the 0.2 `@nuxt/content` uses. The 2026-11-25 audit found
  that the route had never served a request: `@nuxt/content` registers its own
  `/raw/**:slug.md` handler, and that handler won. The live site's raw pages
  showed it: they ended with the frontmatter `links` as a list, which only
  Content's handler appends, and carried none of the `{rel=…}` attributes 1.0
  writes. The template deleted its copy for that reason (bb8d41e), and so have
  we.

  `nuxt-agent-discovery` now serves the route, still stringifying with the
  `minimark` that `@nuxt/content` resolves. It writes components in the
  `::component` block syntax the content files use, with props as YAML, so the
  array props that 0.2's HTML-style tags garbled (`:extra-webcams`) come out
  intact. It also opens each page with frontmatter carrying its canonical URL,
  and makes every internal link absolute.
- `@types/node` is declared, though nothing imports it by name. The trip report
  index scripts (see
  [ADR-005](architecture-decision-record.md#adr-005--generate-the-by-objective-trip-report-index-into-markdown-and-match-objective-names-exactly))
  are Node programs type-checked by `tsc -p scripts/tsconfig.json`, which needs
  Node's globals. It arrives transitively through `nuxt`, and relying on that is
  the pattern this project stopped relying on when `shamefullyHoist` went; the
  declaration pins it instead. This is the second package declared without an
  import, alongside `@nuxtjs/mdc` above, and for the same class of reason —
  something other than our own `import` statements resolves it from the root.
- `maplibre-gl` is a dependency for the interactive region map, and
  `@types/geojson` is declared alongside it because `RegionMapLibre.vue` imports
  its types by name; it otherwise arrives only through `maplibre-gl`. Both are
  on trial with the map (ADR-010) and go if the SVG renderer is chosen.

## Other `nuxt.config.ts` tweaks

- `vite.build.chunkSizeWarningLimit: 700` + `optimizeDeps.include` for the
  `@vueuse/core` chunk.
- Two settings the template has since dropped are kept, both because this site
  is a static GitHub Pages bundle and the template is not: the comment at each
  says why. `nitro.prerender.autoSubfolderIndex: false` writes `/foo.html`,
  which GitHub Pages serves at `/foo` without a redirect (the template dropped
  it in 0462726). `icon.provider: 'iconify'` stops `@nuxt/icon` choosing its
  `server` provider, whose endpoint a static host does not have (30e0c06).
  Neither was written down until the 2026-11-25 audit, which reconstructed the
  reasons from the deployment rather than from a record of the original choice.
- `icon.clientBundle` scans the source so every icon ships in the bundle; the
  comment there explains it.
- `devtools.timeline.enabled: true` turns on the DevTools Timeline tab, which
  records composable calls and route changes while `mise run dev` runs. It began
  as an experiment (`851bc647`) and is kept because it improves the dev tooling
  and has no effect on the built site. Since Nuxt 4.7, `nuxt` no longer
  installs DevTools, so `@nuxt/devtools` is a devDependency, on v4 (Vite
  DevTools based, so it needs Vite 8, which Nuxt 4.5+ ships). One peer warning
  comes with it and is upstream's: `@nuxt/devtools` 4.2.1 depends on
  `@vitejs/devtools` ^0.8.3, while the `vite-plugin-vue-devtools` 9 rc it also
  depends on still asks for ^0.7.6.
- `ui.eslint` is the template's, with `RegionMapSvg`'s scoped-style classes
  added to its `ignore` list beside `StarsBg`'s.
- `llms.sections` rewritten from the 2 demo sections to the 8 real sections;
  `mcp.name` set to the site title.
- Dropped the template's `content.experimental.sqliteConnector`, leaving it
  unset. `@nuxt/content` defaults to `better-sqlite3` and switches to `sqlite3`
  by itself in a WebContainer, so pinning either would override a choice
  upstream already makes correctly — and stop tracking it if their
  recommendation changes. This is why `better-sqlite3` is a direct dependency
  here and not in the template, which moved to `native`. The comment at the
  setting in [nuxt.config.ts](../nuxt.config.ts) records why `native` is
  tempting and what would have to change to adopt it; the evidence is in
  [setup-development-environment.md](setup-development-environment.md#stackblitz-does-not-currently-work).
- [content.config.ts](../content.config.ts) keeps the template's two collections
  and their sources, and adds two schema entries: `sitemap` (see above) and the
  optional `links` array that content frontmatter uses.

## Content, components & docs

- Content fully replaced: the template's demo docs → the 8 hiking sections.
- Custom content components: `WeatherLocation`, `FacebookGroupLinks`,
  `SafetyWarnings`, `HeroMountains`, `StarsBg`; added `pages/changelog.vue`, and
  `AlphabetJump`, a sticky A–Z strip `[...slug].vue` shows on pages whose
  headings are all letters — in practice the generated trip report indexes.
  `RegionMap`, on the three section index pages, renders the region shapes the
  trip index generates, as SVG or on MapLibre; see
  [ADR-010](architecture-decision-record.md#adr-010--trial-two-region-map-renderers-side-by-side-svg-by-default).
  The template's `AppHeader/Footer/Logo`, `PageHeaderLinks`, and dynamic
  `[...slug].vue` routing are kept. Its `TemplateMenu`, a switcher between the
  Nuxt UI templates, is removed: it has no place on this site.
- The content-page OG image is nuxt-og-image's `Docs` community template,
  ejected (`869a42ec`) and renamed to
  `app/components/OgImage/ContentPage.takumi.vue`, not the template's own
  component of that name. The template's draws the Nuxt logo in Nuxt green and
  prints `ui.nuxt.com`; the community one takes the site name and colours as
  props, which `[...slug].vue` passes. The rename keeps it from sharing a name
  with the community original, which nuxt-og-image registers in dev; see
  [testing-notes.md](testing-notes.md#open-graph-images).
- Added [architecture-decision-record.md](architecture-decision-record.md).
- Small code-level differences, such as the MCP tools logging the error they
  swallow, the header's tooltips or the search entry for `/changelog`, are
  explained by a comment where they are made rather than listed here.

## Visual identity

The template's look is Nuxt's own brand, and a site left on it reads as a Nuxt
demo rather than a hiking site. These replace it:

- **Palette.** The template overrides Tailwind's `green` with Nuxt's brand scale
  (`#00DC82`). This site drops that override and defines two scales of its own
  in [main.css](../app/assets/css/main.css): `forest` as `primary` and `glacier`
  as `secondary`. Tailwind's stock `green` is back in place for `success`. The
  500 and 400 shades are the ones Nuxt UI uses for light and dark mode, and are
  chosen to clear 4.5:1 text contrast in both. The OG image takes the colour as
  a literal in `[...slug].vue`, which has to be kept in step by hand.
- **Landing hero.** The template's `HeroBackground` glow is replaced by
  `HeroMountains`, a layered ridgeline drawn in the semantic colours. It is an
  SVG rather than a photo so it needs no licence clearance and follows light and
  dark mode on its own; a CC BY-SA–compatible photo of the Rockies would be the
  natural upgrade.
- **Logo and favicon.** [AppLogo.vue](../app/components/AppLogo.vue) is a
  one-colour line mark stroked in `currentColor`, which the header sets to
  `text-primary`. It replaced a pasted-in Noto emoji whose fixed colours clashed
  with the palette and blurred at 24px. `public/favicon.svg` draws the same
  paths and switches shade with `prefers-color-scheme`; `favicon.ico` is the
  fallback, rendered from that SVG at 16, 32 and 48px.

## Licence: CC BY-SA 4.0, not the template's MIT or the org's Apache 2.0

The substance of this repository is *content* — hiking information written in
Markdown — with a comparatively small amount of code to present it. Two other
conventions were in play: the sibling iglootools projects (nbkp, photree) ship
Apache 2.0, and the [Nuxt UI Docs template](https://docs-template.nuxt.dev/)
adopted in `db08e2c5` is MIT.

[CC BY-SA 4.0](../LICENSE) was chosen at the initial commit (`8f3d6276`,
2022-10-18) and deliberately left unchanged when the site was rebuilt on the
MIT-licensed template:

- A content licence fits a content project. Apache 2.0 addresses patent grants
  and code copyright, which do not map onto prose.
- Share-alike keeps derived versions of the hiking information open, which is
  the point of publishing it.
- Taking the template's MIT would have relicensed the content as a side effect
  of changing the presentation layer.

So this repository does not match the Apache 2.0 convention of nbkp and photree,
and that is deliberate rather than an oversight. Contributions are accepted
under CC BY-SA 4.0, and any code lifted out of here for reuse in an
Apache-licensed project needs an explicit relicence of that code.

## Template audits

A full audit compares every file the template tracks with ours, and reads every
template commit since the last audit, so that each difference either matches an
entry above or a comment where it is made, or is closed. A range or version
that merely lags the template is not a divergence: Renovate closes it.

To resume, start from the last row's commit:

```bash
git clone https://github.com/nuxt-ui-templates/docs /tmp/docs-template
git -C /tmp/docs-template log --reverse --format='%ad %h %s' --date=short <commit>..HEAD
```

then diff each file `git -C /tmp/docs-template ls-files` lists, outside
`content/`, against this repository, and add a row here.

| Date | Template commit audited up to | Scope |
|---|---|---|
| 2026-08-07 | `7615a37` (2026-08-03), inferred from the date | Dependency and pnpm sync in #169, not a full audit: it missed two template changes from 2026-06-30 that the next audit caught |
| 2026-11-25 | `e77cb1f6b84dea880ea0d1d54b3b456f8e0920dc` (`nuxt` ^4.7.0) | Full: every tracked file, and every template commit since 2026-06-30 |

### 2026-11-25

- **Adopted from the template.** Nuxt ^4.7.0, `@nuxt/ui` ^4.13.1 and
  `@nuxt/content` ^3.17.0, with every Nuxt module on its latest release, ahead
  of Renovate's 14-day hold; the top-level `prerender` option (6fb6f1f); the
  trailing-slash strip in `[...slug].vue` and `PageHeaderLinks` (797a241); the
  logo link's focus ring (807831e); link styles on the landing page (e795376);
  `/raw/*.md` left to the modules (bb8d41e, see above); `nuxt-agent-discovery`
  (b4f5089); Tailwind class linting through `ui.eslint` (9a1ffbb, ff4f4af),
  whose first run found one class that never existed (`text-neutral` in
  `PageHeaderLinks`, replaced by the template's expression); `@nuxt/fonts` left
  to `@nuxt/ui`, which retired the Renovate hold on it and, as fontless 1.x
  dropped esbuild, the esbuild override; the template's caret ranges for
  `@takumi-rs/core` and `@nuxtjs/mcp-toolkit`, which had been exact pins since
  the January migration with no recorded reason; and `@iconify-json/lucide`
  under `dependencies`, where it keeps it.
- **Recorded as deliberate.** `autoSubfolderIndex: false` and the `iconify`
  icon provider, `devtools.timeline`, the CI workflows, and the ejected OG image
  template — each entry above.
- **Open, for the owner to decide.** Whether `robots.txt` should keep the
  `Content-Signal` line `nuxt-agent-discovery` adds by default.
- **Not applicable.** The `TemplateMenu` changes (9822080, c153042), as the
  component is removed; the Node version in `ci.yml` (4279708); the simplified
  `renovate.json` (9b71fc4); and the `llms` fixes in b95e3fe, which this site's
  `llms` block, built from `siteUrl`, already had.
