# AGENTS.md

Alberta Hiking Resources is a community resource site for hiking and scrambling
in the Canadian Rockies: a Nuxt 4 and Nuxt UI 4 app, built from the Nuxt UI Docs
template and deployed to GitHub Pages. Tasks run through mise.

## Commands

- `mise run preflight-quick`: every lint and the fast tests, before each
  commit.
- `mise run preflight`: every lint and test CI runs, and the build, every few
  commits and before review. `mise run ci-preflight` adds the install, as CI
  does.
- `mise run fmt` after editing any file.
- `mise run dev` serves the site locally.
- `mise tasks` lists the rest.
- An agent has no mise-activated shell, so run a mise task when one does the
  job, `uv run --no-sync <tool>` for a tool in the project's environment, and
  `mise exec -- <tool>` for one mise installs
  ([why](https://github.com/iglootools/common/blob/main/guidelines/project-setup/python-tooling.md#invoke-tools-through-uv-run---no-sync-tool-in-mise-tasks-not-bare)).

## Nuxt and Nuxt UI: ask the MCP servers, not your training data

This project tracks Nuxt 4 and Nuxt UI 4, both of which move faster than any
model's cutoff. Answer questions about them from the MCP servers in `.mcp.json`:

- `nuxt-docs` and `nuxt-ui` are hosted and always reachable.
- `nuxt` is served by the dev server, so it is only reachable while
  `mise run dev` is running. It reports *this* app's resolved config, routes,
  components and auto-imports; prefer it over inferring any of those from the
  file tree.

## Guidelines

The shared iglootools guidelines govern every change. Claude Code loads them
through the `iglootools` plugin. Other agents: read `coding/general.md` and
`coding/git.md` before any change, and the guideline whose trigger matches the
files you are changing, using
[iglootools/common's index](https://github.com/iglootools/common/blob/main/guidelines/README.md).
Read [docs/guidelines.md](docs/guidelines.md) before any change too: it holds
this project's exceptions and its own rules, and links to the project's other
guidelines files.

## Where things are

[CONTRIBUTING.md](CONTRIBUTING.md) indexes every document, from setup to the
architecture and the template divergence. Read a document when the task reaches
it, not up front.
