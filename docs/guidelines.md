# Project-Specific Guidelines

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

- [Out of scope](#out-of-scope)
- [Exceptions](#exceptions)
  - [Exempt replacement, pin and lock-file-maintenance updates from `minimumReleaseAge`](#exempt-replacement-pin-and-lock-file-maintenance-updates-from-minimumreleaseage)
  - [Tolerate StackBlitz bypassing `minimumReleaseAge` while it cannot start](#tolerate-stackblitz-bypassing-minimumreleaseage-while-it-cannot-start)
  - [Do not call the shared link checker until the docs need one](#do-not-call-the-shared-link-checker-until-the-docs-need-one)
<!-- tocstop -->

## Out of scope

This is not a Python project as
[python-tooling.md](https://github.com/iglootools/common/blob/main/guidelines/project-setup/python-tooling.md)
defines one: `pyproject.toml` only installs the iglootools command. The
Python-only guidelines, pyright-lsp included, do not apply.

That leaves an assistant here with no language server to resolve symbols
against. The `.mcp.json` servers ground answers about Nuxt and this app's
resolved config instead, as
[setup-development-environment.md](setup-development-environment.md#ai-assistant-setup-mcp)
describes, until a Vue/TS LSP plugin becomes available at project scope.

## Exceptions

### Exempt replacement, pin and lock-file-maintenance updates from `minimumReleaseAge`

Overrides
[dependency-automation.md › Extend the shared Renovate presets](https://github.com/iglootools/common/blob/main/guidelines/project-setup/dependency-automation.md#extend-the-shared-renovate-presets):
[renovate.json](../renovate.json) lifts the base preset's 14-day hold for these
updates.

**Why:** they carry no release timestamp. The base preset's
`minimumReleaseAgeBehaviour: "timestamp-optional"` is documented to let such
updates through, which would make the exemption redundant, but nobody has yet
seen on the Dependency Dashboard that it does for these three. Until then the
exemption keeps an undated update from waiting on a hold it can never satisfy.

**Retires when:** the preset alone is seen to suffice: remove the packageRule
and the `lockFileMaintenance` override, and check on the Dependency Dashboard
that the next lock-file maintenance update is not held for
`renovate/stability-days`. Restore them if it is.

### Tolerate StackBlitz bypassing `minimumReleaseAge` while it cannot start

Overrides
[dependency-automation.md › Extend the shared Renovate presets](https://github.com/iglootools/common/blob/main/guidelines/project-setup/dependency-automation.md#extend-the-shared-renovate-presets):
[.stackblitzrc](../.stackblitzrc) boots via npm, which cannot read
`pnpm-lock.yaml`, so it resolves fresh from the `package.json` ranges on every
boot and bypasses the base preset's 14-day hold entirely.

**Why:** the hole is tolerable only because nothing can start that way:
StackBlitz cannot run this project, as
[setup-development-environment.md](setup-development-environment.md#stackblitz-does-not-currently-work)
records.

**Retires when:** StackBlitz becomes able to run the project. Close the hole
*before* anyone relies on it, not after.

### Do not call the shared link checker until the docs need one

Overrides
[shared-workflows.md › Call the shared link checker instead of copying it](https://github.com/iglootools/common/blob/main/guidelines/project-setup/shared-workflows.md#call-the-shared-link-checker-instead-of-copying-it):
no workflow checks the links.

**Why:** 693 of the 759 links in tracked Markdown are in `content/` and point at
third-party consumer sites, many of which block any non-interactive client. A
weekly check would report on other people's websites, not on this repository.
The measurements are in [link-checking.md](guidelines/link-checking.md).

**Retires when:** anything in `docs/` starts linking outward more heavily. Call
the shared workflow then with its `paths` input scoped to `docs/**` and
`README.md`. Checking `content/` stays off the table until its links stop being
predominantly third-party consumer sites.
