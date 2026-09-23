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

All three sections use the **same fourteen region ids, titles, icons and ordering**, so the
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
- The three weather pages outside the Rockies — Okanagan and Thompson, Chilliwack, and the
  Sea to Sky — keep their own slugs under a *Beyond the Rockies* heading. They are outside
  the shared taxonomy on purpose: no trip report source covers them, and stretching the
  regions to reach the coast would make them mean less everywhere else.
