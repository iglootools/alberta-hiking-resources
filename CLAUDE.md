# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Tech stack, project structure, and where this app diverges from the Nuxt UI Docs template: @docs/architecture.md

Log of architectural decisions and the reasoning behind them: @docs/architecture-decision-record.md

## Guidelines and Workflow

Before writing any code, apply the guidelines at write time, not as a post-hoc review.

Common guidelines (shared across iglootools projects):

@../common-guidelines/coding.md
@../common-guidelines/tooling.md

`python.md` is deliberately not imported — this is a TypeScript/Nuxt project. The imports above
require [common-guidelines](https://github.com/iglootools/common-guidelines) cloned as a sibling
directory; see @docs/setup-development-environment.md.

## Documentation Lookup

Answer Nuxt and Nuxt UI questions from the MCP servers in `.mcp.json`, not from training data — this
project tracks Nuxt 4 and Nuxt UI 4, both of which move faster than any model's cutoff:

- `nuxt-docs` and `nuxt-ui` are hosted and always reachable.
- `nuxt` is served by the dev server, so it is only reachable while `mise run dev` is running. It
  reports *this* app's resolved config, routes, components, and auto-imports — prefer it over
  inferring any of those from the file tree.

Setup and verification: @docs/setup-development-environment.md

## Build & Test Commands

`mise` task reference, plus build, lint, typecheck, and CI details: @docs/building-and-testing.md

Manual validation of the Open Graph image, sitemap, and `robots.txt`: @docs/testing-notes.md

## Releasing and Publishing

semantic-release flow and GitHub Pages deployment: @docs/releasing-and-publishing.md
