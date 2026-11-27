# Contributing

This file covers changing the site's code. To contribute content to the site
itself, see the in-site
[contributing guide](https://www.alberta-hiking-resources.org/getting-started/contributing).

## Getting started

- [docs/setup-development-environment.md](docs/setup-development-environment.md)
  — follow to set up Codespaces, a dev container or a local environment, and the
  iglootools Claude Code plugin and MCP servers. Codespaces needs no install:
  [open one](https://codespaces.new/iglootools/alberta-hiking-resources) and
  the whole build and test pipeline runs there. StackBlitz cannot currently run
  the project; the doc says why and how to retest
- [docs/building-and-testing.md](docs/building-and-testing.md) — follow to
  build, lint and typecheck, and look up the checks CI runs, the dependency
  management, and the GitHub settings the repository depends on
- [docs/testing-notes.md](docs/testing-notes.md) — follow to check the Open
  Graph image, sitemap and `robots.txt` by hand
- [docs/releasing-and-publishing.md](docs/releasing-and-publishing.md) — follow
  to cut a release with semantic-release and deploy to GitHub Pages

## Guidelines

This project follows the shared
[iglootools guidelines](https://github.com/iglootools/common/tree/main/guidelines).
[docs/guidelines.md](docs/guidelines.md) records where it deviates from them and
the rules it adds.

Contributors follow the iglootools
[code of conduct](https://github.com/iglootools/.github/blob/main/CODE_OF_CONDUCT.md);
report vulnerabilities as the
[security policy](https://github.com/iglootools/.github/blob/main/SECURITY.md)
describes.

## Understanding the code

- [docs/architecture.md](docs/architecture.md) — understand the tech stack and
  how the project is structured
- [docs/divergence-from-the-template.md](docs/divergence-from-the-template.md) —
  find out where this project departs from the Nuxt UI Docs template, and why,
  before changing anything the template provides
- [docs/architecture-decision-record.md](docs/architecture-decision-record.md) —
  find out which architectural decisions were taken, and why, and append one
  when taking a decision
