# Project Guidelines

Where this project departs from the shared
[iglootools guidelines](https://github.com/iglootools/common/blob/main/guidelines/README.md),
and which of their sections do not apply. Read it before any change: it
overrides the shared guidelines where the two conflict. Departures that apply at
one place are comments there, as
[Documented Exceptions](https://github.com/iglootools/common/blob/main/guidelines/applying-the-guidelines.md#documented-exceptions)
describes, and are indexed below. Decisions about the stack are in the
[architecture decision record](architecture-decision-record.md), and how far the
app follows its upstream template in
[divergence-from-the-template.md](divergence-from-the-template.md).

<!-- toc -->
**On this page**

- [Leave the Python guidelines out of scope](#leave-the-python-guidelines-out-of-scope)
- [Deviations](#deviations)
  - [Exempt replacement, pin and lock-file-maintenance updates from `minimumReleaseAge`](#exempt-replacement-pin-and-lock-file-maintenance-updates-from-minimumreleaseage)
  - [Tolerate StackBlitz bypassing `minimumReleaseAge` while it cannot start](#tolerate-stackblitz-bypassing-minimumreleaseage-while-it-cannot-start)
  - [Do not call the shared link checker until the docs need one](#do-not-call-the-shared-link-checker-until-the-docs-need-one)
<!-- tocstop -->

## Leave the Python guidelines out of scope

Nothing here is Python, so these shared sections do not apply:

| Shared section | Why it does not apply |
|---|---|
| [`coding/python.md`](https://github.com/iglootools/common/blob/main/guidelines/coding/python.md) and [`pypi-publishing.md`](https://github.com/iglootools/common/blob/main/guidelines/project-setup/pypi-publishing.md) in full, and [`python-tooling.md`](https://github.com/iglootools/common/blob/main/guidelines/project-setup/python-tooling.md) apart from Mise and uv | the stack is pnpm and mise, and the site deploys to GitHub Pages. `pyproject.toml` only installs the iglootools command, and the plugin skips `python.md`, as no `.py` file is tracked |
| [`ide.md` › Pin the venv for pyright in `[tool.pyright]`](https://github.com/iglootools/common/blob/main/guidelines/project-setup/ide.md#pin-the-venv-for-pyright-in-toolpyright) | `.venv` holds only the iglootools command, and there is no `[tool.pyright]` to pin |
| [`claude-code.md` › Install pyright-lsp at project scope in every Python project](https://github.com/iglootools/common/blob/main/guidelines/project-setup/claude-code.md#install-pyright-lsp-at-project-scope-in-every-python-project) | Python-specific. No LSP plugin is installed for this project |

**Why:** the last one leaves a real gap: an assistant here has no import graph
to resolve symbols against. The `.mcp.json` servers ground answers about Nuxt
and this app's resolved config instead, as
[setup-development-environment.md](setup-development-environment.md#ai-assistant-setup-mcp)
describes.

**Retires when** a Vue/TS LSP plugin becomes available at project scope.

## Deviations

### Exempt replacement, pin and lock-file-maintenance updates from `minimumReleaseAge`

[renovate.json](../renovate.json) lifts the 14-day hold of the shared
[base preset](https://github.com/iglootools/common/blob/main/guidelines/project-setup/dependency-automation.md#extend-the-shared-renovate-presets)
for these updates. Its `description` fields give the reason.

**Retires:** never. Those updates carry no release timestamp, so the hold could
never be satisfied.

### Tolerate StackBlitz bypassing `minimumReleaseAge` while it cannot start

[.stackblitzrc](../.stackblitzrc) boots via npm, which cannot read
`pnpm-lock.yaml`, so it resolves fresh from the `package.json` ranges on every
boot and bypasses the 14-day hold entirely.

**Why:** the hole is tolerable only because nothing can start that way:
StackBlitz cannot run this project, as
[setup-development-environment.md](setup-development-environment.md#stackblitz-does-not-currently-work)
records.

**Retires when** StackBlitz becomes able to run the project. Close the hole
*before* anyone relies on it, not after.

### Do not call the shared link checker until the docs need one

This overrides
[Call the shared link checker instead of copying it](https://github.com/iglootools/common/blob/main/guidelines/project-setup/shared-workflows.md#call-the-shared-link-checker-instead-of-copying-it).

**Why:** 693 of the 759 links in tracked Markdown are in `content/` and point at
third-party consumer sites, many of which block any non-interactive client. A
weekly check would report on other people's websites, not on this repository.
The measurements are in [link-checking.md](guidelines/link-checking.md).

**Retires when** anything in `docs/` starts linking outward more heavily: call
the shared workflow then with its `paths` input scoped to `docs/**` and
`README.md`. Checking `content/` stays off the table until its links stop being
predominantly third-party consumer sites.
