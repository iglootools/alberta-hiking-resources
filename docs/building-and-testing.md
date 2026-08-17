# Building and Testing

## Task reference

The `mise` tasks wrap the underlying `pnpm` scripts:

| Task                  | Description                              |
| --------------------- | ---------------------------------------- |
| `mise run install`    | Install dependencies (frozen lockfile)   |
| `mise run dev`        | Start the Nuxt dev server                |
| `mise run lint`       | Lint with ESLint                         |
| `mise run typecheck`  | Run the Nuxt type check                  |
| `mise run build`      | Build the Nuxt application               |
| `mise run build-pages`| Build for GitHub Pages deployment        |
| `mise run preview`    | Preview the production build             |
| `mise run ci`         | Run the full CI pipeline locally         |
| `mise run update`     | Update all dependencies to latest        |

The sections below cover the build, lint, and CI tasks in more detail; see
[setup-development-environment.md](setup-development-environment.md) for
`install` and `dev`.

## Linting and type checking

```bash
mise run lint        # eslint .
mise run typecheck   # nuxt typecheck
```

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
[releasing-and-publishing.md](releasing-and-publishing.md). The preset changes the
Nitro output, so a plain `mise run build` is not what ships.

## CI pipeline

`mise run ci` runs the same sequence as the [`ci.yml`](../.github/workflows/ci.yml)
workflow: `install` → `lint` → `typecheck` → `build`.

## Bundling icon sets

Icons are pulled from [Iconify](https://iconify.design/) (browse them at
[icones.js.org](https://icones.js.org/)). To bundle every icon set the content
references with the app, find which sets are in use and install them as
dev dependencies:

```bash
brew install rg
rg "i-[a-z0-9-]+:" .

pnpm i -D \
  @iconify-json/logos \
  @iconify-json/lucide \
  @iconify-json/material-symbols \
  @iconify-json/noto \
  @iconify-json/simple-icons \
  @iconify-json/streamline-emojis \
  @iconify-json/streamline-stickies-color
```

## Dependency management

[Renovate](https://github.com/apps/renovate/installations/select_target) keeps
dependencies up to date. The GitHub app is installed on the repository; its
behavior is configured in [renovate.json](../renovate.json) (grouped "all"
updates, 14-day minimum age). The [`renovate-mise-lock.yml`](../.github/workflows/renovate-mise-lock.yml)
workflow keeps the mise lock in sync with Renovate's updates.

Grouping and the 14-day `minimumReleaseAge` come from the shared
[project setup guidelines](https://github.com/iglootools/common-guidelines/blob/main/project-setup.md#all-projects),
where the reasoning is written up.

### Renovate and Dependabot are split by job, not by ecosystem

The 14-day delay is a supply-chain measure and it works by *waiting*. Waiting is
exactly the wrong response to a published advisory, where the fix is already known.
So the two tools run at opposite latencies over the same ecosystems:

| Tool | Handles | Latency |
|---|---|---|
| Renovate ([renovate.json](../renovate.json)) | routine version updates, grouped into one PR | delayed 14 days |
| Dependabot ([dependabot.yml](../.github/dependabot.yml)) | security updates only | immediate |

`open-pull-requests-limit: 0` is what implements the split: it switches off Dependabot's
*version* updates, and security PRs are exempt from that limit. Letting both tools
propose versions would mean duplicate PRs, half of which ignore the 14-day delay.

**The config file is only half the setup.** Dependabot security updates are *repository
settings*, and `dependabot.yml` cannot switch them on — a repo with the file committed
and those settings off looks configured while watching nothing. They are enabled here;
see [Github Config](#github-config) below for the commands and how to verify.

Two traps worth knowing, both silent. `target-branch` must stay out of
`dependabot.yml` — pointing it at a non-default branch disables security updates for
that ecosystem. And `package-ecosystem` must match what the lockfile actually is:
`npm` is the correct value for pnpm (there is no `pnpm` value), and a mismatch does not
error, it just finds nothing and reports green.

### Further reading

See also the shared
[GitHub Workflows guidelines](https://github.com/iglootools/common-guidelines/blob/main/project-setup.md#github-workflows)
for the `workflow_dispatch`, lockable-mise-backend, and `timeout-minutes` rules the
workflows here follow.

## Github Config

One-time repository settings, none of which live in the repo:

- **Enable Dependabot security updates.** These are *repository settings*, and
  [.github/dependabot.yml](../.github/dependabot.yml) cannot switch them on — that file only
  shapes the resulting PRs and restricts Dependabot to the security half
  (`open-pull-requests-limit: 0`, because Renovate owns routine version updates and delays them
  14 days; see [Dependency management](#dependency-management) above). A repo with the file
  committed and these settings off looks configured while watching nothing:

    ```bash
    gh api -X PUT repos/iglootools/alberta-hiking-resources/vulnerability-alerts
    gh api -X PUT repos/iglootools/alberta-hiking-resources/automated-security-fixes
    ```

    Both are required, and they are separate switches: `vulnerability-alerts` is what notices a
    vulnerable dependency, `automated-security-fixes` is what opens the fix PR. Alerts alone
    give a Security tab entry and no PR — the easy state to land in by accident, since alerts
    are the more discoverable of the two.

    Each `PUT` returns `204 No Content` and prints nothing, so verify rather than assume:

    ```bash
    gh api repos/iglootools/alberta-hiking-resources/vulnerability-alerts -i | head -1   # expect HTTP/2.0 204
    gh api repos/iglootools/alberta-hiking-resources/automated-security-fixes            # expect "enabled": true
    ```

    A `404` from the first is the disabled state, not a missing endpoint. Undo with the same two
    URLs and `-X DELETE`. Needs admin on the repository; the dependency graph is a prerequisite
    and is on by default for public repositories.
- **Settings → Pages → Source** must be set to **GitHub Actions** — see
  [releasing-and-publishing.md](releasing-and-publishing.md).

## Testing notes

See [testing-notes.md](testing-notes.md) for manually validating Open Graph
images, the sitemap, and `robots.txt`.
