# Architecture

This site is a [Nuxt](https://nuxt.com/) application built on
[Nuxt UI](https://ui.nuxt.com/) and the
[Nuxt UI Docs template](https://docs-template.nuxt.dev/), with content authored
in Markdown via [Nuxt Content](https://content.nuxt.com/) and
[Nuxt MDC](https://github.com/nuxt-content/mdc). Beside it, a TypeScript script
builds the trip report index from other people's blogs and commits what it
writes into the site's content.

This page says how the code is organised and where a new piece goes. For the
log of significant decisions, see
[architecture-decision-record.md](architecture-decision-record.md).

<!-- toc -->
**On this page**

- [Built with](#built-with)
- [How the code is organised](#how-the-code-is-organised)
- [The site: `app/` and `content/`](#the-site-app-and-content)
- [The server: `server/`](#the-server-server)
- [The trip report index: `scripts/trip-report-index/`](#the-trip-report-index-scriptstrip-report-index)
  - [Terms](#terms)
  - [How a run flows](#how-a-run-flows)
  - [Modules](#modules)
  - [Where new code goes](#where-new-code-goes)
- [Initial project setup](#initial-project-setup)
- [Divergence from the template](#divergence-from-the-template)
<!-- tocstop -->

## Built with

- [Nuxt UI](https://ui.nuxt.com/)
- [Nuxt UI Docs Template](https://docs-template.nuxt.dev/)
- [Nuxt MDC](https://github.com/nuxt-content/mdc)
- Icons via [Iconify](https://iconify.design/) (browse at
  [icones.js.org](https://icones.js.org/))

## How the code is organised

| Folder | What it is | Runs |
| --- | --- | --- |
| `content/` | Every page, as Markdown, in numbered section folders | Read by Nuxt Content at build time |
| `app/` | The Nuxt app: pages, layout, components, and small utilities | In the browser and at prerender |
| `server/` | The MCP tools that let an AI assistant read the pages | In Nitro, on request |
| `scripts/trip-report-index/` | The indexer behind the trip report region pages and the region map | By hand, `mise run build-trip-index`; never in CI |

`content.config.ts` declares the two Nuxt Content collections: `landing` (the
home page) and `docs` (every other page), with the frontmatter keys the app
reads beyond Nuxt Content's own: `links` (the page header's buttons) and
`generated` (set on the pages the indexer writes).

The indexer is the only code that writes into the others, and only into files it
owns: the region pages under `content/3.hiking-scrambling-beta/3.trip-reports/`
(all but the hand-written `01.index.md`), `app/assets/region-map.json` and
`public/region-map/regions.geojson`. Its output is committed, so a blog being
down can delay a refresh but never break a build.

## The site: `app/` and `content/`

- **`content/`** holds the pages. A folder is a section of the sidebar, its
  numeric prefix only orders it, and each page is served at its path without
  the prefixes. Weather, accommodation and trip reports share one region
  taxonomy (ADR-006), so each region has a page in all three; the indexer's
  checks fail when one is missing.
- **`app/pages/`**: `index.vue` is the landing page, `[...slug].vue` renders
  every `docs` page (and leaves "Edit this page" off a page whose frontmatter
  says `generated: true`), and `changelog.vue` lists the GitHub releases.
- **`app/layouts/docs.vue`** is the sidebar layout every `docs` page uses.
- **`app/components/`** holds the site's own furniture: the header and footer,
  `PageHeaderLinks` (copy the page as Markdown, from the `/raw/*.md` route),
  `AlphabetJump` (the A–Z strip over the generated index pages), and the two
  region map renderers, `RegionMapSvg` and `RegionMapLibre` (ADR-010).
- **`app/components/content/`** holds the components an author writes in
  Markdown with MDC syntax: `::region-map{section="weather"}`,
  `WeatherLocation`, `SafetyWarnings`, `FacebookGroupLinks`, and the landing
  page's `HeroMountains` and `StarsBg`.
- **`app/composables/useSearchFiles.ts`** loads the search index the first time
  a reader opens search, rather than on every page.
- **`app/utils/`**: `region-map.ts` is what the two map renderers share (each
  region's links, label and colour), and `release-notes.ts` reduces a release's
  Markdown to plain Markdown before the changelog renders it.

The site also exposes its content to machines, all from the same Markdown:
`nuxt-llms` writes `llms.txt` and `llms-full.txt`, the `/raw/*.md` route serves
a page's source, and the MCP tools below read the `docs` collection. That is why
the generated pages are Markdown rather than data a component renders.

## The server: `server/`

- **`server/mcp/tools/`**: `list-pages` and `get-page`, registered by
  `@nuxtjs/mcp-toolkit`. Each handler only reaches the collection and the
  request; what it does with them is in `server/utils/mcp-pages.ts`.
- **`server/utils/mcp-pages.ts`** is the tools' behaviour as functions of the
  query and the fetch they are handed, so it is tested without a Nuxt server.
- **`server/utils/request-event.ts`** gives a handler that is not passed one,
  such as an MCP tool, the current request's event.

## The trip report index: `scripts/trip-report-index/`

How to run it is in
[building-and-testing.md](building-and-testing.md#rebuilding-the-trip-report-index),
and why it places objectives the way it does is in ADR-007, ADR-009 and ADR-011.

### Terms

- A **report** is one trip report, video or GPS trace a source published; an
  adapter scrapes it as a `RawReport`.
- An **objective** is one summit, ridge or lake, with every report that covers
  it from every source. Reports join an objective by its **canonical key**
  (`canon.ts`), never by fuzzy matching.
- A **region** is one page of the taxonomy (`regions.ts`). The **catch-all
  page** lists what nothing places, and is not a region.
- A **claim** puts an objective in a region and keeps the **signal** behind it.
  A signal is **stated** when a blog, a tick-list or a curator says so, and
  **inferred** when the script works it out from links, companions,
  trailheads or the map.
- The **tick-lists** are Adam Laycock's lists of three guidebooks and the
  11,000ers (`guidebooks.ts`); the **gazetteers** are the Canadian and US
  place-name databases (`gazetteer.ts`).

### How a run flows

```text
main.ts ── cli.ts (arguments, exit codes)
   │
   └─ run.ts: checks.ts first, then read, then write
        │
        ├─ read   sources/<id>.ts ─┐
        │         guidebooks.ts ───┼─ through fetch.ts (cached HTTP)
        │         gazetteer.ts ────┘
        │
        ├─ place  build.ts ── inference.ts ── build.ts again → BuildResult
        │
        └─ write  render.ts + pages.ts ───→ content/…/3.trip-reports/*.md
                  region-map.ts + basemap.ts → app/assets/region-map.json,
                                               public/region-map/regions.geojson
                  review.ts ────────────────→ trip-report-review.md (not committed)
```

Everything that can fail runs before the first write, so a failed run leaves
the committed output whole.

### Modules

| Group | Modules | Role |
| --- | --- | --- |
| Entry | `main.ts`, `cli.ts`, `run.ts` | Read argv and the environment, parse options, orchestrate one run |
| Edges | `fetch.ts`, `pages.ts`, `checks.ts` | The HTTP cache, the page files, the consistency checks on hand-written content |
| Sources | `sources/index.ts`, `sources/catalog.ts`, `sources/<id>.ts`, `sources/wordpress.ts`, `sources/selfhosted-wordpress.ts` | The registry; what the core knows of each source; one adapter per blog; the two WordPress readers adapters share |
| Reference data | `guidebooks.ts`, `gazetteer.ts`, `basemap.ts` | The tick-lists, the place names, the Natural Earth basemap |
| Core | `types.ts`, `regions.ts`, `sections.ts`, `canon.ts`, `areas.ts`, `html.ts`, `curation.ts`, `stated.ts`, `build.ts`, `inference.ts`, `geo.ts`, `region-map.ts` | Pure functions over the values the edges read |
| Output | `render.ts`, `review.ts`, `output.ts`, `errors.ts` | Page Markdown, the curation worksheet, console formatting, the typed errors |

The rules the layout keeps:

- **The core never imports the registry.** `build.ts`, `render.ts` and the rest
  import `sources/catalog.ts`, which holds each source's id, label, order,
  region vocabulary and rank, and no scraper; only the entry, `main.ts` and
  `run.ts`, imports `sources/index.ts`, which adds them. A broken adapter breaks
  the run, not the core or its tests.
- **Source ids are typed.** `SourceId` is derived from `SOURCE_IDS` in the
  catalog, and the registry, the vocabularies and `RawReport` are typed by it,
  so a mistyped id does not compile.
- **Values passed between stages live in `types.ts`**, so no two modules import
  each other: the build's result, what inference hands back, the claims.
- **The core reads no ambient state.** Paths, options, credentials, the clock
  and the fetcher are parameters, filled in by `main.ts` and `run.ts`; tests
  pass their own.
- **Adapters reach the network only through the `Fetcher` they are given**,
  and parse JSON through `fetchJson`, so a body is cached only once it is
  accepted.

### Where new code goes

- **A new source**: an adapter `sources/<id>.ts` exporting its scrape function;
  its id in `SOURCE_IDS`, its label and home page in `DETAILS`, and, if it
  states regions, its vocabulary in `REGION_MAP` and its place in
  `REGION_PRIORITY`, all in `sources/catalog.ts`; its scraper and minimum in
  `SCRAPERS` in `sources/index.ts`. The compiler reports a step missed. A
  test goes in `test/adapters.test.ts`.
- **A new region**: `REGIONS` and `NEIGHBOURS` in `regions.ts`, a page in the
  weather and accommodation sections and a card on the trip reports index (the
  run fails until they exist), and any source labels for it in the catalog's
  vocabularies.
- **A correction to the data**: `curation.ts`, the one file meant to be edited
  by hand. The worksheet each run writes lists what needs one.
- **A section path or folder**: `sections.ts`.
- **Tests**: `test/`, run by `node --test`. The doubles are in
  `test/support.ts`, passed in as parameters rather than patched.

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

Recorded separately, in
[divergence-from-the-template.md](divergence-from-the-template.md) — the
licence, the SEO modules, the toolchain and dependency choices, and the
`nuxt.config.ts` changes.
