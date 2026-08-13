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
[project setup guidelines](https://github.com/iglootools/common-guidelines/blob/main/tooling.md#all-projects),
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

**The config file is only half the setup.** Dependabot security updates are a
*repository setting*; `dependabot.yml` shapes the resulting PRs but cannot switch them
on. A repo with the file and the setting off looks configured and watches nothing.
Verify:

```bash
gh api repos/iglootools/alberta-hiking-resources/vulnerability-alerts -i | head -1
gh api repos/iglootools/alberta-hiking-resources/automated-security-fixes
```

Expect `HTTP/2.0 204` and `"enabled": true`. Both are enabled on this repository.

Two traps worth knowing, both silent. `target-branch` must stay out of
`dependabot.yml` — pointing it at a non-default branch disables security updates for
that ecosystem. And `package-ecosystem` must match what the lockfile actually is:
`npm` is the correct value for pnpm (there is no `pnpm` value), and a mismatch does not
error, it just finds nothing and reports green.

### Further reading

See also the shared
[GitHub Workflows guidelines](https://github.com/iglootools/common-guidelines/blob/main/tooling.md#github-workflows)
for the `workflow_dispatch`, lockable-mise-backend, and `timeout-minutes` rules the
workflows here follow.

## Testing notes

See [testing-notes.md](testing-notes.md) for manually validating Open Graph
images, the sitemap, and `robots.txt`.
