# AGENTS.md

Alberta Hiking Resources is a community resource site for hiking and scrambling in the Canadian
Rockies: a Nuxt 4 and Nuxt UI 4 app, built from the Nuxt UI Docs template and deployed to GitHub
Pages. Tasks run through mise.

## Commands

- `mise run ci`: everything CI runs (install, lint, shell lint, typecheck, tests, build).
- `mise run dev` serves the site locally; `mise tasks` lists the rest.

## Nuxt and Nuxt UI: ask the MCP servers, not your training data

This project tracks Nuxt 4 and Nuxt UI 4, both of which move faster than any model's cutoff.
Answer questions about them from the MCP servers in `.mcp.json`:

- `nuxt-docs` and `nuxt-ui` are hosted and always reachable.
- `nuxt` is served by the dev server, so it is only reachable while `mise run dev` is running. It
  reports *this* app's resolved config, routes, components and auto-imports; prefer it over
  inferring any of those from the file tree.

## Guidelines

The shared iglootools guidelines govern every change. Claude Code loads them through the
`iglootools` plugin. Other agents: read `coding/general.md` and `coding/git.md` before any change,
and the `project-setup/` guideline whose trigger matches the files you are changing, using the
tables in [iglootools/common's README](https://github.com/iglootools/common#contents). Read
[docs/guidelines.md](docs/guidelines.md) before any change too: it records where this project
deviates from them and its own rules.

## Where things are

Read a document when the task reaches it, not up front.
[CONTRIBUTING.md](CONTRIBUTING.md) indexes all of them.

- [docs/architecture.md](docs/architecture.md): the tech stack and project structure.
- [docs/divergence-from-the-template.md](docs/divergence-from-the-template.md): where this app
  departs from the Nuxt UI Docs template, and why. Read before changing anything the template
  provides.
- [docs/architecture-decision-record.md](docs/architecture-decision-record.md): the decisions
  taken and their reasoning. Append to it when making one.
- [docs/building-and-testing.md](docs/building-and-testing.md): the mise tasks, build, lint,
  typecheck and CI.
- [docs/testing-notes.md](docs/testing-notes.md): checking the Open Graph image, sitemap and
  `robots.txt` by hand.
- [docs/setup-development-environment.md](docs/setup-development-environment.md): setup,
  including the MCP servers.
- [docs/releasing-and-publishing.md](docs/releasing-and-publishing.md): semantic-release and the
  GitHub Pages deployment.
