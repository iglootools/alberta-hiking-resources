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
where the reasoning is written up: the delay is a supply-chain measure and works by
waiting, which is why the guidelines pair it with a Dependabot config limited to
security updates (`open-pull-requests-limit: 0`) so advisory fixes are not also
delayed by two weeks. **This repository has no `.github/dependabot.yml` yet**, so
that immediate half is currently missing — the grouped, delayed half is all that
runs. See also the shared
[GitHub Workflows guidelines](https://github.com/iglootools/common-guidelines/blob/main/tooling.md#github-workflows)
for the `workflow_dispatch`, lockable-mise-backend, and `timeout-minutes` rules the
workflows here are expected to follow.

## Testing notes

See [testing-notes.md](testing-notes.md) for manually validating Open Graph
images, the sitemap, and `robots.txt`.
