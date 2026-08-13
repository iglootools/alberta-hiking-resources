# Alberta Hiking Resources

![License](https://img.shields.io/github/license/iglootools/alberta-hiking-resources)
![CI Status](https://github.com/iglootools/alberta-hiking-resources/actions/workflows/ci.yml/badge.svg?branch=main)

Find your way in the jungle of FB and Meetup groups. Hiking Partners. Information. Ideas.

A community resource hub for anyone hiking or scrambling in the Canadian Rockies —
meetup groups, hiking & scrambling beta, weather & trail conditions, events,
outdoor gear, hike organizers, and an FAQ.

🌐 **Live site:** [www.alberta-hiking-resources.org](https://www.alberta-hiking-resources.org)

The site is a [Nuxt](https://nuxt.com/) application built on the Nuxt UI Docs
template, with content authored in Markdown and deployed to GitHub Pages.

## Development

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/iglootools/alberta-hiking-resources)

No install needed to try a change. **Codespaces** — or any other
[dev container](.devcontainer/devcontainer.json) host, including local Docker —
gives a full Linux environment where the whole build and test pipeline runs.

StackBlitz would be the zero-account option, but it
[cannot currently build this project](docs/setup-development-environment.md#stackblitz-does-not-currently-work);
the reason and how to retest are written up rather than left to be rediscovered.

For those, and for a local setup, see
[docs/setup-development-environment.md](docs/setup-development-environment.md).

## Contribute

Practical information:

- [docs/setup-development-environment.md](docs/setup-development-environment.md) — development setup
- [docs/building-and-testing.md](docs/building-and-testing.md) — build, lint, CI, and dependency management
- [docs/releasing-and-publishing.md](docs/releasing-and-publishing.md) — releases and GitHub Pages deployment
- [docs/testing-notes.md](docs/testing-notes.md) — Open Graph image, sitemap, and robots.txt validation
- [common-guidelines](https://github.com/iglootools/common-guidelines) — shared coding guidelines, imported by [CLAUDE.md](CLAUDE.md)

Conceptual information:

- [docs/architecture.md](docs/architecture.md) — tech stack, project structure, and divergence from the Nuxt UI Docs template
- [docs/architecture-decision-record.md](docs/architecture-decision-record.md) — log of architectural decisions

To contribute content to the site itself, see the in-site
[contributing guide](https://www.alberta-hiking-resources.org/getting-started/contributing).

## License

Shield: [![CC BY-SA 4.0][cc-by-sa-shield]][cc-by-sa]

This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License][cc-by-sa].

[![CC BY-SA 4.0][cc-by-sa-image]][cc-by-sa]

[cc-by-sa]: http://creativecommons.org/licenses/by-sa/4.0/
[cc-by-sa-image]: https://licensebuttons.net/l/by-sa/4.0/88x31.png
[cc-by-sa-shield]: https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg
