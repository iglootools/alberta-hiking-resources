# Building and Testing

<!-- toc -->
**On this page**

- [Task reference](#task-reference)
- [Linting and type checking](#linting-and-type-checking)
- [Tests](#tests)
- [Building](#building)
- [CI pipeline](#ci-pipeline)
- [Bundling icon sets](#bundling-icon-sets)
- [Rebuilding the trip report index](#rebuilding-the-trip-report-index)
  - [Annie Ouellet's YouTube channel needs an API key](#annie-ouellets-youtube-channel-needs-an-api-key)
- [Dependency management](#dependency-management)
  - [Renovate and Dependabot are split by job, not by ecosystem](#renovate-and-dependabot-are-split-by-job-not-by-ecosystem)
  - [Further reading](#further-reading)
- [GitHub Config](#github-config)
- [Testing notes](#testing-notes)
<!-- tocstop -->

## Task reference

`mise tasks` lists every task with its description, which is the one place the
full list is kept; [mise.toml](../mise.toml) and
[mise-tasks/](../mise-tasks/) define them. Tasks are named by family, so the
name says what a task does:

| Family | What it does | Run them all with |
|---|---|---|
| `lint-*` | fails without writing anything; each description says how to fix a failure | `mise run lint` |
| writers (`fmt-*`, `toc`) | rewrite files: `fmt` runs ESLint's fixes, dprint and rumdl | `mise run fmt` |
| `test` | runs the tests | `mise run test` |
| `preflight`, `preflight-quick` | every lint and the tests, then the build (`preflight-quick` leaves out the build) | — |
| `ci-*` | what one workflow job runs: `ci-preflight`, `ci-release` | — |

The entry points beyond those:

| Task | Description |
|---|---|
| `mise run install` | Install dependencies (frozen lockfile) |
| `mise run dev` | Start the Nuxt dev server |
| `mise run build` | Build the Nuxt application |
| `mise run build-pages` | Build for GitHub Pages deployment |
| `mise run preview` | Preview the production build |
| `mise run build-trip-index` | Rebuild the by-objective trip report index |
| `mise run renovate-dry-run` | List the updates Renovate would propose, writing nothing (needs `gh auth`) |
| `mise run release` | Release with semantic-release; `--dry-run` previews ([releasing-and-publishing.md](releasing-and-publishing.md)) |

The sections below cover the build, lint, and CI tasks in more detail; see
[setup-development-environment.md](setup-development-environment.md) for
`install` and `dev`.

## Linting and type checking

```bash
mise run lint      # every lint-* task
mise run fmt       # fix what the formatters can, then re-run the lint that failed
```

`lint-types` runs `pnpm typecheck`, which type-checks the Nuxt app with
`nuxt typecheck` and the scripts under [scripts/](../scripts/) with `tsc`.
`lint-markdown` checks the repository's Markdown, not the MDC pages under
`content/`.

## Tests

```bash
mise run test        # pnpm test: node --test over the *.test.ts files
```

The tests cover the trip report index under
[scripts/trip-report-index/test/](../scripts/trip-report-index/test/), and
mostly its failure paths: a scrape that degrades quietly is the failure that
matters there, and it is the one a normal run cannot show. They use Node's
built-in runner, so they add no dependency, and they never touch the network.
Every collaborator a test needs to replace — the HTTP client, the clock, the
environment, the directories — is a parameter, so tests pass a stub in rather
than patching a module, and assert on the fields of the typed errors in
[errors.ts](../scripts/trip-report-index/errors.ts) rather than on message text.

The app and the server have tests too (`app/**/*.test.ts` and
`server/**/*.test.ts`), run by the same runner in the same `mise run test`.

## Building

Build the application for production:

```bash
mise run build
```

Locally preview the production build:

```bash
mise run preview
```

`mise run build` is the ordinary Nuxt build. The deployed site is built by
`mise run build-pages` (`nuxt build --preset github_pages`), which is what
[`publish.yml`](../.github/workflows/publish.yml) runs — see
[releasing-and-publishing.md](releasing-and-publishing.md). The preset changes
the Nitro output, so a plain `mise run build` is not what ships.

## CI pipeline

`mise run ci-preflight` runs the same sequence as the
[`preflight.yml`](../.github/workflows/preflight.yml) workflow: `install` →
`preflight` (every lint and `test` in parallel, then `build`). The build is in
`preflight` because it is itself a check: a broken page fails the prerender.
[`release.yml`](../.github/workflows/release.yml) runs `ci-release`: `install` →
`release`.

## Bundling icon sets

Icons come from [Iconify](https://iconify.design/) (browse them at
[icones.js.org](https://icones.js.org/)), and the site uses only the Lucide set
(`i-lucide-*`), from the `@iconify-json/lucide` package. The build bundles every
icon it finds in use through `icon.clientBundle.scan` in
[nuxt.config.ts](../nuxt.config.ts), so a new Lucide icon needs nothing more. An
icon from another set needs that set's `@iconify-json/<set>` package beside
Lucide's. Why, and the icons the scan cannot see, are in
[ADR-002](architecture-decision-record.md#adr-002--bundle-icons-at-build-time-extending-the-icon-scan-rather-than-replacing-its-globs).

## Rebuilding the trip report index

The region pages under
[content/3.hiking-scrambling-beta/3.trip-reports/](../content/3.hiking-scrambling-beta/3.trip-reports/)
are generated from the trip report sources registered in
[sources/index.ts](../scripts/trip-report-index/sources/index.ts), not written
by hand:

```bash
mise run build-trip-index              # re-read the sources and rewrite the pages
mise run build-trip-index -- --refresh # discard the HTTP cache first
mise run build-trip-index -- --dry-run # report what would change, writing no page
mise run build-trip-index -- --help    # every option
```

Responses are cached under `node_modules/.cache/trip-report-index`, so iterating
on a parser costs nothing; `--refresh` is what an actual content refresh uses. A
full read runs to thousands of throttled requests and takes a while. Most are
individual reports read only because their source's index gives no region (Bob
Spirko's and Golden Scrambles' for a locality line, Andrew Nugara's for his
links to neighbouring reports, On-Top's for the trailhead's coordinates, among
others). The rest read the federal gazetteer, and the USGS one for the American
side of the border, whose place-name positions place objectives by the placed
ones around them — see
[ADR-007](architecture-decision-record.md#adr-007--list-an-objective-under-every-region-a-signal-names-and-show-the-signals)
and
[ADR-009](architecture-decision-record.md#adr-009--empty-the-catch-all-page-from-evidence-the-sources-already-publish).
`--dry-run` (`-n`; `--review-only` is kept as an alias) runs everything a real
run does, the consistency checks and the basemap read included, and reports
what would change without touching any page. The consistency checks run before
the scrape, so a run that would fail them stops before fetching anything.

The task exits 0 on success, 1 when the run fails, and 2 for a usage error: an
unknown argument, or a missing `YOUTUBE_API_KEY`.

The same run draws the region map the three section index pages show, from where
the placed objectives are, and writes it as `app/assets/region-map.json` (the
SVG map) and `public/region-map/regions.geojson` (the MapLibre map). Its land,
lakes and borders are three Natural Earth files, read once and cached like
everything else. The summary lists any region drawn too small to click easily —
see
[ADR-010](architecture-decision-record.md#adr-010--trial-two-region-map-renderers-side-by-side-svg-by-default).

### Annie Ouellet's YouTube channel needs an API key

Every other source needs nothing. Annie Ouellet's channel is read through the
**YouTube Data API v3**, and the task **fails**, with exit code 2, unless
`YOUTUBE_API_KEY` is set:

```bash
export YOUTUBE_API_KEY=...      # in your shell profile, not in the repo
mise run build-trip-index -- --refresh
```

Create the key at
[console.cloud.google.com](https://console.cloud.google.com/apis/credentials) —
a project, *YouTube Data API v3* enabled, an API key, no billing. One run costs
about 7 of the 10,000 free daily quota units, so it is effectively free.

It is not scraped, and should not be: YouTube's `robots.txt` disallows
`/youtubei/`, which is what the channel page's own pagination calls, and
`/feeds/videos.xml`, which rules out the RSS feed. Scraping the channel page is
allowed but reaches only the newest 30 of some 270 videos. The API is the
sanctioned route and the only complete one.

The failure is deliberate, and it is a precondition rather than an error partway
through: every source's preflight runs before the first request, so a missing
key stops the run in the first second, having written nothing and fetched
nothing. Carrying on without it would be worse than stopping — the other sources
would scrape, every region page would be rewritten, and Annie's videos would
quietly disappear from every one of them. A missing key is a broken refresh, not
a smaller one.

`DEBUG=1` adds a stack trace, for a fault in the script rather than in the
configuration.

It is deliberately **not** part of `mise run preflight` or the build. The output
is committed, so a blog being unreachable delays a refresh rather than breaking
a deploy.

Each run also writes `trip-report-review.md` at the repo root (gitignored). It
opens with the objectives that are new on the catch-all page since the version
the run replaced — what a refresh brought in, to place first — then lists the
objectives nothing could place, the ones listed in more than one region, names
split into separate mountains, the ones placed by inference alone (about one in
ten of which is expected to be wrong), near-miss names that may be duplicates,
and names written without their "Mount" or "Peak" beside the objective that has
it. The last two are candidates for `ALIASES`, never merged automatically; a
pair confirmed to be two places goes in `DISTINCT_NAMES` instead, so it is not
offered again. It ends with every name dropped as out of scope and why, to catch
a peak excluded by mistake. Work through it and record the decisions in
[scripts/trip-report-index/curation.ts](../scripts/trip-report-index/curation.ts)
— that file, and the blogs themselves, are the only correct places to fix a
wrong entry. Editing a generated `.md` is pointless; the next run overwrites it.

If a source is redesigned, its adapter will usually return far fewer reports
than before and the run fails with the count it expected. Fix the adapter rather
than lowering the minimum in
[sources/index.ts](../scripts/trip-report-index/sources/index.ts); that guard is
what keeps a broken parser from silently emptying a region page.

The reasoning behind generating Markdown, and behind matching objective names
exactly rather than fuzzily, is in
[ADR-005](architecture-decision-record.md#adr-005--generate-the-by-objective-trip-report-index-into-markdown-and-match-objective-names-exactly).

## Dependency management

[Renovate](https://github.com/apps/renovate/installations/select_target) keeps
dependencies up to date. The GitHub app is installed on the repository; its
behavior is configured in [renovate.json](../renovate.json) (grouped "all"
updates, 14-day minimum age). The
[`renovate-mise-lock.yml`](../.github/workflows/renovate-mise-lock.yml) workflow
keeps the mise lock in sync with Renovate's updates.

Grouping and the 14-day `minimumReleaseAge` come from the shared
[dependency automation guidelines](https://github.com/iglootools/common/blob/main/guidelines/project-setup/dependency-automation.md),
where the reasoning is written up.

### Renovate and Dependabot are split by job, not by ecosystem

The 14-day delay is a supply-chain measure and it works by *waiting*. Waiting is
exactly the wrong response to a published advisory, where the fix is already
known. So the two tools run at opposite latencies over the same ecosystems:

| Tool | Handles | Latency |
|---|---|---|
| Renovate ([renovate.json](../renovate.json)) | routine version updates, grouped into one PR | delayed 14 days |
| Dependabot ([dependabot.yml](../.github/dependabot.yml)) | security updates only | immediate |

`open-pull-requests-limit: 0` is what implements the split: it switches off
Dependabot's *version* updates, and security PRs are exempt from that limit.
Letting both tools propose versions would mean duplicate PRs, half of which
ignore the 14-day delay.

**The config file is only half the setup.** Dependabot security updates are
*repository settings*, and `dependabot.yml` cannot switch them on — a repo with
the file committed and those settings off looks configured while watching
nothing. They are enabled here; see [Github Config](#github-config) below for
the commands and how to verify.

Two traps worth knowing, both silent. `target-branch` must stay out of
`dependabot.yml` — pointing it at a non-default branch disables security updates
for that ecosystem. And `package-ecosystem` must match what the lockfile
actually is: `npm` is the correct value for pnpm (there is no `pnpm` value), and
a mismatch does not error, it just finds nothing and reports green.

### Further reading

See also the shared
[GitHub Workflows guidelines](https://github.com/iglootools/common/blob/main/guidelines/project-setup/workflows.md)
for the `workflow_dispatch`, lockable-mise-backend, and `timeout-minutes` rules
the workflows here follow.

## GitHub Config

One-time repository settings, none of which live in the repo. Each is recorded
as the command that applies it and the command that verifies it, so it can be
re-applied rather than reconstructed from the UI.

- **Enable Dependabot security updates.** These are *repository settings*, and
  [.github/dependabot.yml](../.github/dependabot.yml) cannot switch them on —
  that file only shapes the resulting PRs and restricts Dependabot to the
  security half (`open-pull-requests-limit: 0`, because Renovate owns routine
  version updates and delays them 14 days; see
  [Dependency management](#dependency-management) above). A repo with the file
  committed and these settings off looks configured while watching nothing:

    ```bash
    gh api -X PUT repos/iglootools/alberta-hiking-resources/vulnerability-alerts
    gh api -X PUT repos/iglootools/alberta-hiking-resources/automated-security-fixes
    ```

  Both are required, and they are separate switches: `vulnerability-alerts` is
  what notices a vulnerable dependency, `automated-security-fixes` is what opens
  the fix PR. Alerts alone give a Security tab entry and no PR — the easy state
  to land in by accident, since alerts are the more discoverable of the two.

  Each `PUT` returns `204 No Content` and prints nothing, so verify rather than
  assume:

    ```bash
    gh api repos/iglootools/alberta-hiking-resources/vulnerability-alerts -i | head -1   # expect HTTP/2.0 204
    gh api repos/iglootools/alberta-hiking-resources/automated-security-fixes            # expect "enabled": true
    ```

  A `404` from the first is the disabled state, not a missing endpoint. Undo
  with the same two URLs and `-X DELETE`. Needs admin on the repository; the
  dependency graph is a prerequisite and is on by default for public
  repositories.

- **GitHub Pages builds from GitHub Actions** (Settings → Pages → Source), which
  is what lets [`publish.yml`](../.github/workflows/publish.yml) deploy the site
  — see [releasing-and-publishing.md](releasing-and-publishing.md). Create the
  Pages site with that source, or switch an existing one:

    ```bash
    gh api --method POST repos/iglootools/alberta-hiking-resources/pages -f build_type=workflow   # no Pages site yet
    gh api --method PUT repos/iglootools/alberta-hiking-resources/pages -f build_type=workflow    # existing site
    gh api repos/iglootools/alberta-hiking-resources/pages -q .build_type                         # expect workflow
    ```

- **The default workflow token is read-only, and Actions cannot approve pull
  requests.** Every job declares its own `permissions`, so neither setting
  changes what a workflow here can do; they are the floor for a job that forgets
  to, which would otherwise get a read-write token, and they keep a compromised
  workflow from approving its own pull request. This repository started
  read-write with approval allowed, as older repositories do:

    ```bash
    gh api --method PUT repos/iglootools/alberta-hiking-resources/actions/permissions/workflow \
      -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
    gh api repos/iglootools/alberta-hiking-resources/actions/permissions/workflow
    # expect: {"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}
    ```

  The `PUT` returns `204` and prints nothing. An organization-level policy can
  override either; if the `GET` disagrees after the `PUT`, check
  `gh api orgs/iglootools/actions/permissions/workflow` (needs an org admin).

- **The `github-pages` environment accepts deployments only from named branches,
  `main` among them, and from no tag**, which is what makes a `publish.yml` run
  dispatched with `--ref <tag>` fail rather than deploy, as
  [releasing-and-publishing.md](releasing-and-publishing.md#running-them-by-hand)
  relies on. GitHub creates the environment on the first Pages deployment; the
  policy is set on it:

    ```bash
    gh api --method PUT repos/iglootools/alberta-hiking-resources/environments/github-pages --input - <<'JSON'
    { "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
    JSON
    gh api --method POST repos/iglootools/alberta-hiking-resources/environments/github-pages/deployment-branch-policies \
      -f name=main -f type=branch
    gh api repos/iglootools/alberta-hiking-resources/environments/github-pages/deployment-branch-policies \
      -q '[.branch_policies[] | .name]'
    # expect: ["gh-pages","main"]
    ```

  `gh-pages` is left from the old deploy, which pushed the site to a `gh-pages`
  branch (see the comment in `publish.yml`); `main` is the one that matters, and
  no `v*` tag may be added.

- **The `iglootools-renovate-lock` GitHub App is installed, and its two secrets
  reach this repository**, so
  [`renovate-mise-lock.yml`](../.github/workflows/renovate-mise-lock.yml) pushes
  the regenerated lock as the app and the preflight it triggers starts without
  waiting for approval. The app and the organization secrets
  `RENOVATE_LOCK_APP_CLIENT_ID` and `RENOVATE_LOCK_APP_PRIVATE_KEY` are set up
  once for the whole organization, as the shared
  [lock regenerator guide](https://github.com/iglootools/common/blob/main/guidelines/project-setup/shared-workflows.md#call-the-shared-lock-regenerator-on-renovate-branches)
  describes; this public repository receives them with no step of its own.
  Verify both:

    ```bash
    gh api repos/iglootools/alberta-hiking-resources/actions/organization-secrets -q '[.secrets[].name]'
    # expect both names among them
    gh api orgs/iglootools/installations \
      -q '.installations[] | select(.app_slug == "iglootools-renovate-lock") | .repository_selection'
    # expect: all (needs the admin:org scope)
    ```

  Without them the workflow still runs, pushing with `GITHUB_TOKEN`, and warns:
  the next preflight then waits in `action_required`.

- **Renovate is installed and has run here.** The
  [Renovate app](https://github.com/apps/renovate) is installed on the
  organization for all repositories (install it from that page otherwise), and
  its first run opens the Dependency Dashboard issue, which is how to tell it
  reads [renovate.json](../renovate.json):

    ```bash
    gh api orgs/iglootools/installations \
      -q '.installations[] | select(.app_slug == "renovate") | .repository_selection'
    # expect: all (needs the admin:org scope)
    gh issue list -R iglootools/alberta-hiking-resources --author app/renovate \
      --search 'Dependency Dashboard in:title' --state open
    # expect: one open "Dependency Dashboard" issue
    ```

- **The dependency graph is on**, which
  [`uv-dependency-submission.yml`](../.github/workflows/uv-dependency-submission.yml)
  submits `uv.lock` to, and which Dependabot alerts are raised from. It is on by
  default for public repositories:

    ```bash
    gh api repos/iglootools/alberta-hiking-resources/dependency-graph/sbom -q .sbom.name
    # expect a name rather than a 404 or 403
    ```

- **Private vulnerability reporting is on**, so the channel the organization's
  [security policy](https://github.com/iglootools/.github/blob/main/SECURITY.md)
  points reporters at actually exists. It is off by default:

    ```bash
    gh api --method PUT repos/iglootools/alberta-hiking-resources/private-vulnerability-reporting
    gh api repos/iglootools/alberta-hiking-resources/private-vulnerability-reporting -q .enabled   # expect true
    ```

- **Protect `main` and the release tags with rulesets.** Configured as the
  shared
  [repository conventions](https://github.com/iglootools/common/blob/main/guidelines/project-setup/repository.md#protect-the-default-branch-and-release-tags)
  describe: `main` cannot be deleted or force-pushed, changes go through a pull
  request merged with a merge commit, and the `preflight` check must pass first;
  `v*` tags cannot be deleted or moved, so a published version keeps pointing at
  the commit it was built from.

  ```bash
  gh api --method POST repos/iglootools/alberta-hiking-resources/rulesets --input - <<'JSON'
  {
    "name": "main",
    "target": "branch",
    "enforcement": "active",
    "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
    "rules": [
      { "type": "deletion" },
      { "type": "non_fast_forward" },
      { "type": "pull_request", "parameters": {
          "required_approving_review_count": 0,
          "dismiss_stale_reviews_on_push": false,
          "require_code_owner_review": false,
          "require_last_push_approval": false,
          "required_review_thread_resolution": false,
          "allowed_merge_methods": ["merge"] } },
      { "type": "required_status_checks", "parameters": {
          "strict_required_status_checks_policy": false,
          "do_not_enforce_on_create": false,
          "required_status_checks": [{ "context": "preflight", "integration_id": 15368 }] } }
    ]
  }
  JSON

  gh api --method POST repos/iglootools/alberta-hiking-resources/rulesets --input - <<'JSON'
  {
    "name": "release tags",
    "target": "tag",
    "enforcement": "active",
    "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
    "rules": [{ "type": "deletion" }, { "type": "update" }]
  }
  JSON
  ```

  To change an existing ruleset, `PUT` the same payload to
  `repos/iglootools/alberta-hiking-resources/rulesets/<id>` (ids from
  `gh api repos/iglootools/alberta-hiking-resources/rulesets`). Verify what
  GitHub actually enforces — an `active` ruleset with an empty `include` list
  protects nothing and looks enabled all the same:

  ```bash
  gh api repos/iglootools/alberta-hiking-resources/rules/branches/main -q '[.[].type]'
  # expect: ["deletion","non_fast_forward","pull_request","required_status_checks"]
  ```

  The tag ruleset has no equivalent endpoint, so read its `include` back
  instead:

  ```bash
  id=$(gh api repos/iglootools/alberta-hiking-resources/rulesets -q '.[] | select(.name == "release tags") | .id')
  gh api "repos/iglootools/alberta-hiking-resources/rulesets/$id" -q .conditions.ref_name.include
  # expect: ["refs/tags/v*"]
  ```

  `preflight` (the job in `preflight.yml` that runs `ci-preflight`) must keep
  reporting on every pull request. It runs on every push (the `push` trigger in
  `preflight.yml`), which covers pull request branches; a `paths` or `branches`
  filter added there would leave the pull requests it skips unmergeable.

## Testing notes

See [testing-notes.md](testing-notes.md) for manually validating Open Graph
images, the sitemap, and `robots.txt`.
