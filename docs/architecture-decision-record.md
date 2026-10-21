# Architecture Decision Record

This file logs the explicit architectural decisions taken on this project. Decisions are appended over time, newest at the bottom, and are not edited retroactively — if a decision is revisited, a new entry is added that supersedes the previous one.

ADR-002 and ADR-003 were written up on 2026-08-13, having previously lived in
[guidelines.md](guidelines.md) as "deviations". They were not deviations from the shared
[common guidelines](https://github.com/iglootools/common) at all — they are decisions
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

---

## ADR-004 — Let retired URLs 404 rather than ship meta-refresh stubs

**Date:** 2026-09-07
**Status:** Accepted — supersedes the approach proposed in
[#174](https://github.com/iglootools/alberta-hiking-resources/pull/174), which is closed unmerged

### Context

Google Search Console reports 16 URLs under **Not found (404)**. They are the pre-Nuxt-4
structure — everything under `/hiking-groups` and `/practical-information`, retired by
`db08e2c5` — plus pages renamed since. The complete historical set was recovered from the
build output this repo used to commit: 26 retired paths, each mappable to the page that
replaced it, plus 5 pages that survived the restructure but were also served with a
trailing slash.

**GitHub Pages has no runtime server, so a redirect has to *be* a file.** What Nitro emits
for a `redirect` route rule is an HTML stub whose entire content is:

```html
<meta http-equiv="refresh" content="0; url=/weather-trail-conditions/trail-conditions">
```

Google follows these and treats them as redirects, and `@nuxtjs/sitemap` recognises the exact
markup (`NuxtRedirectHtmlRegex`) and keeps the stubs out of `sitemap.xml`. #174 implemented
this and it worked: all 16 reported URLs resolved to a live page, `sitemap.xml` stayed at 59
entries, CI green.

### Decision

Do not ship the redirects. A 404 is the answer for a page that no longer exists.

### Rationale

- The stubs are not redirects. The status code is 200, and a client that does not run the
  refresh gets a blank page. The mechanism only works for the one consumer it is aimed at.
- Both URL forms need their own file — `/a/b` is served from `a/b.html`, `/a/b/` from
  `a/b/index.html`, and on GitHub Pages neither falls back to the other. That is 57 files in
  the bundle (26 × 2, plus the 5 trailing-slash-only) whose only reader is a crawler.
- The failure mode is silent and points the wrong way. Route rules are trailing-slash
  *insensitive* — radix3 strips the slash before matching, with `strictTrailingSlash` unset —
  so a rule keyed `/faq/` also matches `/faq` and replaces the live page with a stub pointing
  at itself. An earlier revision of that branch did this to five live pages; the build stayed
  green and the only signal was `sitemap.xml` dropping from 59 entries to 54. Sidestepping it
  needed a `prerender:done` hook writing files outside the route-rule mechanism entirely.
- None of it is verifiable before deploying. Meta-refresh handling on the real host, and
  whether GitHub Pages resolves `/a/b` to `a/b.html` rather than the adjacent `a/b/index.html`,
  are both only confirmed in production.
- What is given up is real but small: whatever ranking and inbound links those URLs still hold
  is discarded rather than passed on. This is a hobby content site, not a business whose
  traffic depends on it.

### Consequences

- The 404s stay in Search Console. Google drops them from the report over time; nothing needs
  doing when it does.
- **The recovered URL map is not lost, and is the input to any future fix.** It lives on the
  unmerged branch, which is deliberately not deleted:

  ```bash
  git show origin/fix/legacy-url-redirects:nuxt.config.ts   # legacyRedirects + trailingSlashOnlyRedirects
  ```

- **Retires when** the site moves to a host that issues real 301s (Cloudflare Pages, Netlify).
  The same map becomes `routeRules` there and every objection above disappears at once: real
  status codes, no stub files, no `prerender.routes` list, no trailing-slash trap. Revisit this
  as part of any hosting change rather than on its own.
- **Signal to watch** in the meantime: a retired URL showing inbound traffic or links worth
  keeping. Absent that, the cost of the 404s is theoretical and the stubs are not worth their
  complexity.

---

## ADR-005 — Generate the by-objective trip report index into Markdown, and match objective names exactly

**Date:** 2026-09-22
**Status:** Accepted

### Context

The [trip reports page](../content/3.hiking-scrambling-beta/3.trip-reports/1.index.md) listed
half a dozen blogs and left the reader to search each one. The blogs between them publish
roughly 2,700 trip reports covering about 1,650 distinct objectives, and the question a
reader actually has — *who has written up this mountain?* — could only be answered by
visiting every site in turn.

All six sources turned out to be machine-readable, each with a usable region of its own:

| Source | Index | Region from |
|---|---|---|
| Bob Spirko | 5 category pages | URL path, else the locality line in the report |
| Explor8ion | 32 region pages + sitemap | region page, plus a sub-range per trip |
| Steven Song | `sitemap.xml` + alphabetical list | URL path |
| Golden Scrambles | image-map region pages + alphabetical log | region page, else an `area:` field |
| Virtual Hiker | WordPress.com REST API | post categories |
| Steep Sheep | WordPress.com REST API (`type=page`) | a country in the title, else inherited |
| Annie Ouellet | YouTube Data API v3 (needs a key) | the video title's area field |

A seventh source, Annie Ouellet's YouTube channel, is read through the **YouTube Data API
v3** rather than scraped. Her video titles are the best-structured metadata of any source
— "Takakkaw Peak, Yoho National Park, BC - July 18th 2026" gives objective, area and date —
— though only on her later videos: the earlier half reads "Mount Temple scramble" or
"Door Jamb/ Loder peak/ Jura creek loop/", so the adapter also strips trailing activity
words, reads an area stated in prose ("Crypt lake hike in Waterton"), and splits her
slash-separated multi-summit days. Without that roughly 40% of her videos became
objectives of their own rather than joining the peak every other source reported.
YouTube's `robots.txt` disallows `/youtubei/` (the channel page's own pagination) and
`/feeds/videos.xml` (the RSS feed), leaving only the newest 30 of ~270 videos reachable
otherwise. The API needs a key, and the run **fails** in preflight unless
`YOUTUBE_API_KEY` is set. Skipping the source instead would rewrite all fourteen pages
from the other six sources and silently drop her videos from every one of them, which is
the silent degradation the shared guidelines warn against; a missing key is a broken
refresh, not a smaller one. Her
[spreadsheet](https://onedrive.live.com/) was assessed too and holds no links at all —
380 logged trips, 321 unique objectives, zero URLs — so it adds nothing to an index of
links.

Adam Laycock also publishes four tick-lists, which are read as a fourth kind of signal:
membership, a grade, and a region for each objective on them. Three are guidebooks that are
not online; the fourth, the 11,000ers, is not a book at all — the peaks over 11,000 feet,
with an elevation where the others have a grade. It is carried on the same footing because
it is the same shape of fact about an objective, and because his page for a peak is the best
canonical reference available for one. Each list guards its own row count, the way the
source adapters guard their report counts, so a redesign that empties one fails the run
instead of silently dropping several hundred marks.

climbglacier.com was assessed and excluded: its 44 pages are the guidebook series and a
blog, with no per-peak route reports. Voyageur Tripper is behind a subscription, and Annie
Ouellet's spreadsheet returns 401/403 to any anonymous fetch, so both remain plain links.

### Decision

A committed script, [scripts/trip-report-index/](../scripts/trip-report-index/), scrapes the
six sources and **writes Markdown into `content/`**, run by hand via
`mise run build-trip-index`. Objectives are grouped by an **exact** normalised name, never a
fuzzy one. What the script cannot decide is recorded in
[curation.ts](../scripts/trip-report-index/curation.ts) by hand.

### Rationale

- **Markdown, not a component reading JSON.** This site exposes its content four ways that
  all read the Markdown body — `nuxt-llms`, the MCP `get-page` tool, the `/raw/*.md` route,
  and the built-in search. An objective living in a JSON file behind a Vue component would be
  absent from all four, and being findable by search is most of the point. The cost is a
  large diff on each refresh, which is also what makes a bad scrape visible in review.
- **Exact matching, because fuzzy matching is wrong here.** Mountain names are short and
  share a small alphabet, so edit distance conflates distinct neighbouring peaks. Measured
  on the real data at a 0.86 cutoff, **45 near-miss pairs both occur within Explor8ion
  alone** — Mount Kitchener/Mount Michener, Bow Peak/Owl Peak, Mount Shark/Mount Shanks,
  Mount Astley/Mount Cautley — so they are provably different mountains, not spellings. Two
  thirds of all fuzzy candidates were false positives. Merging them would point a reader at
  beta for the wrong peak, which on a hiking site is worse than a missing entry. Genuine
  variants are curated by hand; the run reports near-miss candidates rather than acting on
  them.
- **The same self-consistency test splits shared names apart.** Storm Mountain exists in
  both Banff and the Highwood; Saddle Mountain, Table Mountain, Pilot Mountain and Mount
  Baldy likewise name two peaks each. Where a *single* blog files one name under two
  regions, those are two mountains — no blog lists the same summit twice in different
  regions — so the objective is split in two, each keeping only the reports filed in its
  region. Sources merely disagreeing *with each other* is a boundary question (Bow Peak is
  in Banff and on the Icefields Parkway) and stays merged. 13 names split this way, out of
  108 regions in dispute.
- **Normalisation does the work instead.** Inversion (`Albert, Mount`), `Mt.`, accents and
  HTML entities, curly apostrophes, elevation suffixes (`Mount Temple 3544m`), and
  parentheticals all fold away. Combined trips are indexed under every summit they name, so
  a traverse is findable from any of its peaks.
- **Where an index gives no region, the report itself is asked.** Bob Spirko heads every
  report with a locality line between the title and the date — "Kananaskis, Alberta",
  "Castle Provincial Park Alberta", "Kootenay Park, B.C." — which settles the pages filed
  with no region folder and the "NugaraScrambles" ones, taking him from 738 of 893 reports
  placed to 886. Golden Scrambles carries the same thing as an `area:` field, and Steep
  Sheep brackets a country into titles like "Avalanche Peak (NZ) 1833m". Each is read only
  when the cheap source fails, so the extra requests are in the low hundreds rather than
  one per report. Free-text localities from all three, and from Annie Ouellet's video
  titles, resolve through one shared keyword table in
  [areas.ts](../scripts/trip-report-index/areas.ts) rather than four copies.
- **Regions follow the blogs, not the weather pages or a guidebook.** Every source already
  publishes a region; adopting a scheme none of them uses would mean inventing placements.
  Where sources disagree, the one with the finest taxonomy wins and the disagreement is
  reported.
- **By hand, never in CI or at build time.** The output is committed, so a blog being down
  delays a refresh but can never break a deploy.
- **No new runtime dependency.** Node 26 runs TypeScript directly, and the parsers are
  regex-based against the per-source minimum counts in
  [sources/index.ts](../scripts/trip-report-index/sources/index.ts): a site redesign fails
  the run loudly rather than silently emptying a page.

### Consequences

- Pages are generated. A correction belongs upstream at the blog, or in `curation.ts` —
  never in the `.md`, which carries a header saying so.
- **Curation is the maintenance cost.** `curation.ts` holds name aliases and an
  objective→region override map; the latter exists because two sources publish no usable
  region of their own. Cross-source inheritance does most of the work, leaving a residue
  that is currently 22 objectives. Each run rewrites `trip-report-review.md` (gitignored)
  listing that residue, region conflicts, and near-miss names, in paste-ready form.
- A name shared by two peaks appears on both their region pages, with different links under
  each. That is intended, and the reason the pages are split by region at all.
- `scripts/` is now type-checked in its own right — it sits outside every Nuxt-generated
  tsconfig, so `pnpm typecheck` runs `tsc -p scripts/tsconfig.json` as well.
- **Watch for** a source's `minimumReports` failing after a redesign. Fix the adapter; do
  not lower the minimum, which is what makes the guard meaningful.
- **Retires, or is revisited, if** a source starts blocking automated reads, or if the
  volume makes the Kananaskis page (530 objectives) unwieldy enough to want splitting again.

---

## ADR-006 — One region taxonomy across trip reports, weather, and accommodation

**Date:** 2026-09-22
**Status:** Accepted

### Context

[ADR-005](#adr-005--generate-the-by-objective-trip-report-index-into-markdown-and-match-objective-names-exactly)
introduced fourteen regions for the trip report index, chosen to match how the source blogs
file trips. The weather and accommodation sections already had their own region lists, made
earlier and for a different purpose — the towns you would check a forecast for, and the
towns you would sleep in. The three overlapped without agreeing: *Banff, Lake Louise, and
Yoho* was one weather page but three trip report regions, *South Kananaskis* existed in two
sections and not the third, and nothing in any of them was named the same as its neighbour.

### Decision

All three sections use the **same nineteen region ids, titles, icons and ordering**, so the
three pages for one area differ only in the section part of the path:

```
/hiking-scrambling-beta/trip-reports/crowsnest-castle
/weather-trail-conditions/popular-locations/crowsnest-castle
/accommodation/crowsnest-castle
```

A location that serves two regions is listed in **both**, rather than in whichever came
first. Saskatchewan River Crossing appears under the Icefields Parkway and David Thompson
Country; Golden under Yoho, Rogers Pass and the BC Rockies; Canmore and Banff under
Assiniboine, which has no forecast of its own.

### Rationale

- The three sections answer one planning question between them — *where should I go, what
  will it be like, and where do I sleep* — and were forcing the reader to re-find their area
  in a different vocabulary at each step.
- Duplication is the right answer for a forecast, which is a reading about a place rather
  than a thing that belongs to one region. Filing Saskatchewan River Crossing under only one
  of the two regions it serves makes it wrong for the other.
- The taxonomy came from the blogs rather than from this site, so it is the one of the three
  that was not invented here, and the one most likely to survive contact with new content.
- Four regions had no weather or accommodation content at all. Rather than leave holes,
  locations were added for Radium, Invermere, Fernie, Waiparous, Cochrane, Sundre and
  Pincher Creek, each verified before use: meteoblue's own search API supplied its slugs, and
  the Weather Network pages were checked by content with a known-bad slug as a control, since
  that site returns a rendered page rather than a 404 for some bad input. AccuWeather and
  IQAir fields were **left off** the new cards because neither could be verified — the
  component treats every field as optional, and an unverified link is worse than a missing
  one.

### Consequences

- **Roughly two dozen URLs change and are left to 404**, per
  [ADR-004](#adr-004--let-retired-urls-404-rather-than-ship-meta-refresh-stubs). This is a
  larger set than that decision contemplated, and it is accepted for the same reasons: no
  host-side redirect exists, and the traffic is not load-bearing. Should the site move to a
  host with real 301s, these belong in the same map as the ones ADR-004 records.
- The three sections cannot be kept in step by the type system, because the weather and
  accommodation pages are hand-written Markdown that cannot import `regions.ts`. So
  `mise run build-trip-index` **fails** when a region has no weather or accommodation page,
  which is what stops the alignment rotting the first time a region is added.
- **Five regions beyond the Rockies were added afterwards**, when the Alpine Club and
  Hostelling International turned out to hold properties with nowhere to be listed. Sea to
  Sky, the Fraser Valley and the Okanagan already existed as weather pages and were promoted;
  West Kootenay and Vancouver Island are new. Steven Song covers four of the five properly —
  127 objectives on the Sea to Sky alone — which is what made them viable rather than
  decorative. West Kootenay has four, and says so on the page; it exists because the three
  Kokanee Glacier cabins and HI Nelson had no other home.
- Only two Alpine Club huts remain outside the taxonomy, both belonging to eastern sections
  of the club. A region for a cabin in Ontario would not earn its place on a site about the
  Alberta Rockies, so they are named on the huts page instead.
- **A curated region now outranks the sources rather than only filling their gaps.** Steven
  Song files the entire Selkirk range under one heading, which puts Rogers Pass and the
  Kokanee Glacier 200 km apart in the same bucket; separating them is not something any
  source's own metadata can do.
- **The file order of all three sections is the index order, and the prefixes are
  zero-padded.** The regions were originally numbered in whatever order `regions.ts` listed
  them, which stopped matching the index once the cards were grouped into the six headings;
  they are now renumbered so the sidebar, the index cards and `REGIONS` read the same way
  round, with the group headings repeated as comments in `regions.ts`.

  The padding is the part worth knowing, because it is a silent bug rather than a
  preference. **Nuxt Content orders the sidebar by filename and compares the numeric prefix
  as a string**, so `10.` sorts before `2.` and any folder past nine pages lists itself in an
  order nobody chose — these three had been doing so for months, unnoticed, because nothing
  fails and the index cards looked right. `01.`–`22.` makes lexicographic order numeric
  order. The prefix is stripped from the URL either way, so padding moved no page: the route
  set and `sitemap.xml` were identical at 94 before and after.

  Other content folders are left unpadded because none holds more than nine pages. **Watch
  for** one growing past nine, which reintroduces exactly this, quietly.
- **Every region page links its two siblings**, which is what turns the shared path segment
  from a fact about URLs into something a reader can use — the alignment existed for months
  before the pages actually pointed at each other, and until they did the only way across was
  to edit the address bar. The links appear twice on purpose: as buttons in the page header,
  from the `links` frontmatter that [content.config.ts](../content.config.ts) already defined
  and nothing used, and again as a line in the body, because the header is a Vue concern while
  the Markdown body is what `nuxt-llms`, the MCP `get-page` tool, `/raw/*.md` and the built-in
  search read. The trip report side is emitted by
  [render.ts](../scripts/trip-report-index/render.ts) rather than written by hand, and the
  catch-all page is excluded because it is not a region and has no sibling.

---

## ADR-007 — List an objective under every region a signal names, and show the signals

**Date:** 2026-10-11
**Status:** Accepted — supersedes, in
[ADR-005](#adr-005--generate-the-by-objective-trip-report-index-into-markdown-and-match-objective-names-exactly),
"where sources disagree, the one with the finest taxonomy wins" and the rule that an
objective no blog places waits on the catch-all page

### Context

The index placed each objective in exactly one region: the one stated by the most trusted
blog, per `REGION_PRIORITY`. That had two costs.

- **Disagreement was invisible.** Bow Peak is filed under the Icefields Parkway by two blogs
  and under Banff by one. It appeared on one page, and a reader browsing the other had no way
  to know it existed, or that the blogs disagree about it.
- **A third of the index was unsorted.** Four blogs state no region anywhere. Their
  objectives — 831 of them, more than half Andrew Nugara's and On-Top's — sat on the
  catch-all page, because the only evidence read was region words in their prose, which
  were right 45% and 64% of the time.

Those two blogs turned out to publish better evidence than prose, just not as a region.
Nugara's reports link his reports of neighbouring peaks; On-Top's link the trailhead on
Google Maps, with coordinates in the URL; and official place names have positions in the
federal gazetteer. Each can be turned into a region by asking where the *placed* objectives
around it are. Measured leave-one-out against objectives the blogs do place:

| Signal | Rule | Right |
|---|---|---|
| Nugara's links | ≥ 2 placed links, ≥ 80% agreeing | 186 / 198 (94%) |
| On-Top's trailheads | 5 nearest landmarks, ≥ 80% of the distance-weighted vote, nearest ≤ 25 km | 183 / 195 (94%) |
| Place-name positions | the same, from the name's position | 521 / 571 (91%) |
| Name lookup, for Nugara alone | — | places 49 of 413: his names are mostly unofficial |

Park polygons (CPCAD, Alberta's public land use zones) were assessed and not used. Half the
taxonomy is not a park — Kananaskis and Canmore, the Ghost, the Purcells — and the regions
follow how the blogs file trips rather than legal boundaries, which nearest neighbours
among those very filings reproduce without anyone drawing a line.

### Decision

Collect every **claim** about where an objective is, each recording its **signal** — a
blog's stated region, a curated override, a tick-list's region, or an inference from
sub-ranges, links, trailheads or place names — and list the objective on **every** region
page a claim names. Under each entry, a line says which signals put it in which region,
this page's first and the others linked. Inferred regions say so.

The build runs twice: once with stated claims only, which [inference.ts](../scripts/trip-report-index/inference.ts)
reads for the neighbours it votes among, then again with the inferred claims added.

### Rationale

- **A boundary objective belongs on both sides.** That is already the rule for weather
  locations ([ADR-006](#adr-006--one-region-taxonomy-across-trip-reports-weather-and-accommodation)),
  for the same reason: a reader browsing either region should find it.
- **Showing the signals is what makes inference acceptable.** ADR-005 kept unplaced
  objectives off the region pages because a wrong region is worse than none. That holds
  for a wrong region presented as fact. One presented as "inferred from 4 of the 5 Nugara
  reports it links to", next to whatever the blogs state, lets the reader weigh it — and
  the alternative was not listing a third of the index anywhere useful.
- **Weak evidence beats none.** Below those thresholds — one placed link, a trailhead
  between two regions, a vote split three ways — an objective nothing else places is
  listed under each region with a meaningful share, marked *weakly inferred* with its
  counts. A weak vote never adds a region to an objective that already has one, so it
  cannot dilute a stated placement; it only replaces the catch-all page.
- **A position can also say "outside".** A trailhead or place name more than 50 km from
  every placed objective is outside the taxonomy — On-Top's include Arizona, Hawaii and
  Bavaria — and an objective nothing else places is dropped as out of scope on that
  basis, as it would be had a blog filed it abroad.
- **Curation still wins outright.** A `REGION_OVERRIDES` entry replaces every other claim
  rather than joining them, because it exists for cases where the sources are wrong —
  Steven Song files the whole Selkirk range under one heading.
- **Homonyms are untouched.** A name one blog files in two regions is still split into
  two objectives, and inferred claims are not applied to either: a link vote or a position
  is evidence about a name, and that name belongs to two places.
- **No new runtime dependency, and no committed geodata.** The gazetteer is read through
  the same cached fetcher as the blogs; the geometry is twenty lines.

### Consequences

- **Every region page grows**: one evidence line per entry, plus each objective that is
  disputed or newly inferred. The first run's figures are in the PR that introduced this.
- **About one inferred placement in ten is wrong**, concentrated at boundaries — Banff and
  the Icefields Parkway, Sunshine and Assiniboine, Highway 93 South and Kootenay. The
  review worksheet lists every objective placed by inference alone, for spot-checking, and
  a `REGION_OVERRIDES` entry fixes one.
- **A refresh is slower**: each Nugara and On-Top report is read once (about 1,500 pages)
  and the gazetteer is read in 294 tiles, all cached.
- The place-name positions are under the Open Government Licence – Canada, whose one
  condition is attribution, given on every region page.
- **Revisit** the thresholds in `inference.ts` if the worksheet shows a run of wrong
  inferences; they trade coverage for accuracy, and the measurements above are the
  baseline. Park polygons remain the natural next step for the boundary errors, applied
  to coordinates only.

---

## ADR-008 — Promote the Shuswap and the Monashees to a region

**Date:** 2026-10-11
**Status:** Accepted

### Context

The Monashees were out of scope: Steven Song's Monashee trips were filtered out before they
were read, Golden Scrambles' Craigellachie, Three Valley Gap, Malakwa and Monashee Park
areas were mapped to out-of-scope by hand, and the Shuswap fell into the Okanagan through
keywords like "Salmon Arm" and "Enderby". With
[ADR-007](#adr-007--list-an-objective-under-every-region-a-signal-names-and-show-the-signals)
reading every blog's evidence, enough objectives turned up between the Okanagan and the
Selkirks to stand on their own — 36 on the first run — and a "Further afield" page grouping
everything else by province was the alternative considered.

### Decision

Add `shuswap-monashees` as a full region, with its own weather and accommodation pages as
[ADR-006](#adr-006--one-region-taxonomy-across-trip-reports-weather-and-accommodation)
requires, placed after the Okanagan under "Beyond the Rockies".

### Rationale

- It is a weekend from Calgary down the Trans-Canada, the same footing as the other regions
  in its group, and two blogs already treat it as an area of its own: Steven Song's
  "Monashee Mountains" and Golden Scrambles' area fields.
- **Boundaries.** Salmon Arm, Sicamous, Enderby, Shuswap, Mara and Mabel lakes, Lumby,
  Cherryville, Sugar Lake and Monashee Park are in. A trip report goes to the one region a
  place fits best: Lumby here, as the road to Mabel Lake and the Monashees; Vernon and
  Falkland to the Okanagan; Revelstoke to Rogers Pass, whose peaks are the Selkirks'. Weather
  is the exception, as ADR-006 allows: a town between two regions is a card on both pages,
  which is why Lumby is on the Okanagan's as well as this one. Canoe Mountain, which Steven
  Song files with the Monashees at their far northern end above Valemount, is curated to
  Jasper and Mount Robson.

### Consequences

- The Okanagan loses the Shuswap's objectives, and its accommodation page loses Noisy Creek
  and Hidden Lake, which moved with them.
- The weather and accommodation pages after the Okanagan are renumbered, per ADR-006's
  zero-padded ordering. No URL changes.
- AccuWeather refuses automated reads, so its links on the new cards were confirmed by
  hand. Cherryville has none, nor an IQAir link, which answered only with a bot check;
  ADR-006's rule is that an unverified link is worse than none.

---

## ADR-009 — Empty the catch-all page from evidence the sources already publish

**Date:** 2026-10-19
**Status:** Accepted — extends
[ADR-007](#adr-007--list-an-objective-under-every-region-a-signal-names-and-show-the-signals)

### Context

After ADR-007, 317 objectives were still on the catch-all page. Almost none of them lacked
evidence. They lacked evidence the script read:

| Source | Unsorted | What it publishes that was not read |
|---|---|---|
| Bill Kerr | 92 | WordPress tags naming the area ("Kananaskis" on 125 posts); bare titles ("Brett", "Lady MacDonald") |
| Spectacular Mountains | 89 | A locality line opening every trip ("Elkford, BC, Canada"), on the hundred pages its URL paths do not file |
| Andrew Nugara | 88 | Other peaks in the same report ("Lineham Ridge and GR593982"); Montana peaks a Canadian gazetteer cannot find |
| Sonny Bou | 26 | LOCATION cells naming places the shared keyword table did not know (Moyie, Nakusp, Smithers) |

A fair share of the rest were not trips at all: an "About" page, a camel-caravan series,
a radio antenna test, a surgery, photo essays.

### Decision

Read that evidence, in five changes, and curate the residue by hand:

1. **Spectacular Mountains' locality line**, read from the page body the way Bob Spirko's is.
   A page that does not open with a date is not a trip and is dropped.
2. **Bill Kerr's tags**, as a stated region when they name exactly one area. Measured against
   the regions other blogs give the same objectives, they agree 85 times in 86, and the miss
   was a different mountain of the same name.
3. **Names written without their generic** are listed in the review worksheet beside the one
   objective that has it ("brett" → "mount brett"), for a human to add to `ALIASES`. 87 of
   the first 109 candidates were confirmed; the rest are different features that share a
   word — The Wedge and Wedge Mountain, Whitehorn the ski hill and Whitehorn Mountain.
4. **A new inferred signal: the other peaks in the same report.** One report is one day out,
   so its peaks are within a day's walk of each other. Measured leave-one-out on placed
   objectives, the same-report peaks name the right region 648 times in 655 when they agree,
   and 82 in 97 when they are split, which is used as a weak inference.
5. **The USGS gazetteer for the American side of the extent**, adding names only where the
   Canadian one has none.
6. **Spectacular Mountains' links between its own trips**, read by the same link vote as
   Andrew Nugara's. Leave-one-out on trips the site places, they agree 68 times in 68, and
   the weak votes 72 in 76.
7. **The worksheet shows what a refresh changes**: objectives new on the catch-all page since
   the version the run replaces, and every name dropped as out of scope with its reason, so a
   wrong exclusion is reviewable rather than invisible. Pairs confirmed to be different
   places go in `DISTINCT_NAMES` and stop being offered as alias candidates.

### Rationale

- **Bare names stay a human decision.** ADR-005's argument against fuzzy matching applies
  with more force to a dropped generic than to a typo: a quarter of the candidates were
  different features. Surfacing them costs nothing; merging them unseen would put the wrong
  beta under a peak.
- **The same-report signal is the strongest of the inferred ones** (99%, against 91–94% for
  the others in ADR-007), because it measures distance in what one person walked in a day
  rather than in proximity on a map. A name that two mountains share is excluded on both
  sides, since its region is as likely to be the other mountain's.
- **American names fill gaps rather than join the index.** Indexed together, every name found
  on both sides of the border is dropped as ambiguous, and border names repeat: Sumas
  Mountain is in British Columbia and Washington, Pinnacle Mountain in Banff and Montana.
  Both were placed correctly before and were not after. Filling gaps means no name resolves
  differently than on Canadian data alone, while Glacier National Park's peaks — the only
  region with no positions at all before this — can be found by name and serve as landmarks.
- **Ice and sport climbs are out of scope**, alongside trips abroad and posts that are not
  trips. The index is of hikes and scrambles; an icefall is not an objective a reader of
  these pages is looking for.
- **The residue was researched rather than guessed.** The last six named no place at all,
  and were placed from BC Geographical Names, other blogs' reports of the same objective,
  and route descriptions — Mount Murchison is the one above Woodfibre, with an Echo Lake 2 km
  east of it; Devil's Tongue is in the North Cascades. The two judged less certain say so
  in `curation.ts`. A guess on a hiking site is worse than an honest "not yet sorted", which
  is why the page stays: it is empty now, and says so, until a refresh brings something
  nothing settles.

### Consequences

- The catch-all page went from 317 objectives to none, with 75 more placed, 90 more dropped
  as out of scope or not trips, and 82 duplicate entries merged by the new aliases.
- Reading the evidence exposed three merges of two mountains under one name — Fisher Peak
  (Kananaskis and Cranbrook), Mount Henry (Jasper and Glacier National Park), and the region
  index pages Spectacular Mountains files beside its trips. The first two are separated in
  `REPORT_OBJECTIVES`; the last are dropped by the adapter. Mount Murchison was a fourth,
  above Squamish, and showed a related fault: when one blog files a name in two regions the
  name is split, and each half carried the other's tick-list mark. A mark now goes only to
  the half in the tick-list's own region.
- A test now fails if a `REGION_OVERRIDES` entry is keyed by a spelling an alias replaces.
  Four were, after the aliases above, and had silently stopped applying.
- **Watch for** a source the shared keyword table does not know. Sonny Bou's LOCATION
  column was the largest single gap, and it was fixed by adding place names to
  [areas.ts](../scripts/trip-report-index/areas.ts), where every source that reads free text
  benefits — not by curating its objectives one at a time.

---

## ADR-010 — Trial two region map renderers side by side, SVG by default

**Date:** 2026-10-20
**Status:** Trial

### Context

The three section index pages list their twenty regions as cards, which says nothing about
where a region is. A map that sends a reader to the right page was wanted, needing only to be
"somewhat representative". Two approaches had different enough costs that they were worth
comparing live rather than on paper:

- **An inline SVG** of the regions over a public-domain Natural Earth basemap. Prerendered,
  no library, about 53 KB of data, and nothing fetched at runtime.
- **MapLibre** on OpenFreeMap tiles with hillshading. Real roads, park names and terrain at any
  zoom, at the cost of an ~1 MB library (288 KB gzipped), WebGL, and two third-party hosts read
  on every view — the kind of runtime dependency
  [ADR-002](#adr-002--bundle-icons-at-build-time-extending-the-icon-scan-rather-than-replacing-its-globs)
  removed for icons.

### Decision

Ship both behind one `::region-map{section="…"}` component, with a toggle. Every page load
starts on the SVG map; the choice is deliberately not remembered, so MapLibre, its CSS and
the GeoJSON are loaded only when a reader switches to it on that page. A legend under either map lists the regions
under the index pages' group headings, as links, and highlights its region on the map on
hover; the groups come from the `group` field in `regions.ts`.

Both draw the same shapes, **generated rather than drawn by hand**: `mise run build-trip-index`
cuts the extent into ~5.5 km cells and gives each one the region its nearest placed objectives
vote for, the same distance-weighted vote inference uses
([ADR-007](#adr-007--list-an-objective-under-every-region-a-signal-names-and-show-the-signals)).
It writes `app/assets/region-map.json` for the SVG map and
`public/region-map/regions.geojson` for MapLibre.

### Rationale

- Generated shapes cannot drift from the taxonomy, and they show where the trips actually are
  rather than an administrative boundary — the same reason the regions follow the blogs.
- The SVG map is the default because it costs a reader nothing: it is in the prerendered HTML,
  and its regions are ordinary links that work before hydration and from the keyboard.
- The region cards stay. The map is presentation only; the Markdown that search, `nuxt-llms`,
  MCP and `/raw` read is unchanged.

### Consequences

- **Kootenay is a sliver** on both maps, because nearly every Kootenay objective is also listed
  under Banff or the BC Rockies. The index run reports any region drawn in fewer than 20 cells.
  Region edges are a staircase at cell resolution, which shows far more on MapLibre's sharp
  basemap than on the SVG.
- MapLibre 6 locates its web worker from its own module URL at runtime, which Vite does not
  see, so the worker is imported with `?worker&url` and handed to `setWorkerUrl`. Without that
  the map loads nothing and reports no error; the component now times out to a message
  instead of spinning forever.
- The build warns that one chunk exceeds 700 KB. It is MapLibre, loaded only on demand; the
  limit is left alone so it keeps guarding the main bundle.
- This file now commits derived geodata, which ADR-007 avoided for inference. It is output, like
  the region pages, and regenerated by the same run.
- **Retires when** one renderer is chosen. Delete the other component, the toggle in
  `RegionMap.vue`, and — if the SVG map wins — `maplibre-gl`, `@types/geojson` and the GeoJSON
  output; if MapLibre wins, `basemap.ts` and the SVG output. If neither convinces, hand-drawn
  polygons were the alternative considered.
