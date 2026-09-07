# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Tech stack and project structure: @docs/architecture.md

Where this app diverges from the Nuxt UI Docs template, and why: @docs/divergence-from-the-template.md

Log of architectural decisions and the reasoning behind them: @docs/architecture-decision-record.md

## Guidelines and Workflow

Before writing any code, apply the guidelines at write time, not as a post-hoc review.

Common guidelines shared across iglootools projects come from the `iglootools` plugin, enabled for
this repository in `.claude/settings.json`. It loads the always-on guidelines into every session,
and reads the file-triggered ones when a change reaches them. See
@docs/setup-development-environment.md to install it.

This is a TypeScript/Nuxt project, so `python.md` never loads — the plugin emits it only where a
`pyproject.toml` exists. `ide.md` still applies despite being mostly Python: its mise-vscode and
multi-root workspace rules are what govern this project's `.vscode/settings.json`, and its pyright
half simply does not apply here. `python-tooling.md` is reachable only through `mise.toml`, where
its rules for the mise task set are the relevant part.

Project-specific guidelines — this project's documented deviations from the shared set, which
shared sections are out of scope, and the rules it adds of its own: @docs/guidelines.md

That file is scoped to the shared guidelines. Decisions about Nuxt and the dependency tree are in
the architecture decision record above, not there — and how closely to follow the upstream
template is recorded in @docs/divergence-from-the-template.md.

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
