# Project-Specific Guidelines

For general coding and tooling guidelines, see the
[common guidelines](https://github.com/iglootools/common). Those are defaults, not
dogma: this project may deviate or add rules of its own, **provided the deviation and its
reasoning are documented** — project-wide ones here, local ones in a comment at the point of
deviation.

Most of this project's deviations are local, and so live as comments where they apply. This file
does not restate them; it indexes them, so there is one place to find them all, and holds the
project-wide rules that have no single point of deviation.

Its scope is the shared guidelines. Decisions about Nuxt and the dependency tree belong in the
[architecture decision record](architecture-decision-record.md), and how closely to follow the
upstream template belongs in [divergence-from-the-template.md](divergence-from-the-template.md) —
not here.

## Which shared guidelines apply

`coding.md` applies and reaches every session on its own — the plugin's `SessionStart` hook
emits it. `project-setup.md` and `ide.md` apply too, and are read by the `guidelines` skill when
a change reaches the files each governs, so neither needs listing anywhere.

**`python.md` and `python-tooling.md` do not.** Nothing here is Python, which also puts two
parts of `ide.md` out of scope rather than merely unmet:

| Shared section | Why it does not apply |
|---|---|
| `python-tooling.md`, in full | uv/hatchling/ruff have no counterpart here; the stack is pnpm + mise |
| `ide.md` → Pyright environment resolution | no `.venv` and no `[tool.pyright]` to pin |
| `ide.md` → Claude Code → Pyright LSP plugin | Python-specific. No LSP plugin is installed for this project |

The last one leaves a real gap — an assistant here has no import graph to resolve symbols
against. The `.mcp.json` servers cover the adjacent problem instead: they ground answers about
Nuxt and about this app's resolved config in current reality rather than training data. See
[setup-development-environment.md](setup-development-environment.md#ai-assistant-setup-mcp).
Revisit if a Vue/TS LSP plugin becomes available at project scope.

The `--scope project` rule from that same section still applies in full, should any plugin ever
be added: install it into the repository's `.claude/settings.json` and commit that file.

## Project-wide deviations

The first four concern the shared 14-day `minimumReleaseAge` supply-chain measure and the
dependency policy around it, defined in `project-setup.md` → All Projects. The last concerns CI.

### Renovate exempts some update types from `minimumReleaseAge`

The shared rule is a 14-day hold on every release. `replacement` and `pin` updates, and
`lockFileMaintenance`, are exempt in [renovate.json](../renovate.json).

Rationale and scope are in the `description` fields there. In short: those updates carry no
release timestamp, so the age check can never be satisfied and would leave the PR pending
forever. This is structural rather than temporary — there is no condition that retires it — and
it mirrors what `security:minimumReleaseAgeNpm` does for npm, applied to all datasources.

### TypeScript is held below 6.1

[renovate.json](../renovate.json) caps `typescript` at `<6.1` and the devDependency uses `~`
rather than `^`, which is a deliberate deviation from keeping dependencies current.

**Retires when** `typescript-eslint` widens its peer range: check with
`npm view typescript-eslint peerDependencies`, then lift the bound and widen the version range
together. The full reasoning, including why the bound tracks the peer range rather than just
excluding the next major, is in the rule's `description`.

### esbuild is overridden past the range `fontless` asks for

[pnpm-workspace.yaml](../pnpm-workspace.yaml) forces `esbuild` to `^0.28.2` for the whole tree,
overriding a range a dependency declared. That is normally the wrong tool — it silently
contradicts what upstream said it supports — and it is used here because the alternative is a
security update that cannot happen at all.

[GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) is fixed in 0.28.1.
`fontless@0.2.1` — reached through `@nuxt/fonts`, and the newest release of it there is —
declares `esbuild: ^0.27.0`, so the highest version resolvable was 0.27.7. Dependabot does not
open a PR
it cannot satisfy — it fails the run with `security_update_not_possible`, which is how this was
noticed. Waiting was not an option either: there is no newer `fontless` to upgrade to.

The override is narrow in effect. Every other consumer — Vite 8, `unplugin`, `@unhead/bundler` —
already accepts 0.28, and 0.28.2 was already in the tree for Vite, so this removes a second copy
rather than introducing a version. The reasoning, and why 0.28.0's "breaking" label does not
apply to the API `fontless` uses, are in the comment on the block itself.

**Retires when** `fontless` widens its range: check with `npm view fontless dependencies.esbuild`,
then delete the block, run `pnpm install`, and confirm `grep -c 'esbuild@0.27' pnpm-lock.yaml`
reports none. Leaving it in place after that would pin a floor upstream is managing itself — the
same reason `content.experimental.sqliteConnector` is left unset, which the comment at that
setting in [nuxt.config.ts](../nuxt.config.ts) explains.

### StackBlitz bypasses the 14-day delay

[.stackblitzrc](../.stackblitzrc) boots via npm, and npm cannot read `pnpm-lock.yaml`, so it
resolves fresh from `package.json` ranges on every boot — bypassing `minimumReleaseAge`
entirely.

This is tolerable only because **nothing can actually start that way**; StackBlitz cannot run
this project at all, for reasons documented at length in
[setup-development-environment.md](setup-development-environment.md#stackblitz-does-not-currently-work).
It is a genuine hole in the supply-chain measure, kept because it is currently unreachable.

**Retires when** StackBlitz becomes able to run the project — at which point this must be solved
*before* anyone relies on it, not after.

### No link checker is set up

The shared rule is
[Call the shared link checker instead of copying it](https://github.com/iglootools/common/blob/main/guidelines/project-setup/shared-workflows.md#call-the-shared-link-checker-instead-of-copying-it)
in `project-setup.md`. photree, nbkp and network-infra all call it on a weekly schedule. This
project does not call it at all.

The reason is where the links are. Of 759 link instances in tracked markdown, 693 are in
`content/` — per-trail links out to weather, air-quality, map and social sites — against 66 in
`docs/` and `README.md` combined. Checking that population weekly would report on other
people's websites, not on this repository:

| | |
|---|---|
| 156 instances | meteoblue, AccuWeather and IQAir, which serve 403/429 to any non-interactive client even carrying a browser `User-Agent`. Blocked rather than slow, so no timeout or retry setting reaches them and they would have to be excluded outright |
| 16 instances | trailforks, peakbagger, MEC, ExpertVoice, REI and nuxt.com, blocking the same way, one URL each |
| 6 instances | `localhost:3000` dev-server URLs in `docs/`, unreachable from CI by definition |
| the remainder | consumer sites whose URLs change on their own schedule. A weekly issue would mostly track their churn |

Two findings from measuring rather than assuming, both worth keeping because they are what a
re-evaluation should re-test:

- **Nothing is actually broken.** All 667 unique URLs in tracked markdown were probed, and every
  failure was re-probed serially with a browser `User-Agent`: **zero 404s**. There is no present
  problem for a checker to have caught.
- **Concurrency manufactures failures here.** Probing in parallel produced 73 rate-limit
  failures; retried serially, 14 of them — including the only 404 in the whole run — came back
  200. lychee checks in parallel by default, so it would report failures that are artifacts of
  its own request rate on top of the genuine exclusions above.

**Retires when** the engineering docs are worth checking on their own, which is the cheap
version of this and needs no decision about `content/`. The shared workflow takes a `paths`
input, so a stub scoped to `docs/**` and `README.md` covers those 66 instances and ignores the
693. Do that as soon as anything in `docs/` starts linking outward more heavily. Checking
`content/` stays off the table until its links stop being predominantly third-party consumer
sites.

## Rules of this project's own

### Write down the dead ends, with a retest

Where an investigation concludes that something cannot work, record the finding *and* the
command that would prove it has changed, plus the signal to watch. The
[StackBlitz section](setup-development-environment.md#stackblitz-does-not-currently-work) and
[Why CodeSandbox is not listed](setup-development-environment.md#why-codesandbox-is-not-listed)
are the worked examples. This is the same principle as naming the condition that retires an
exception: it makes the conclusion re-evaluatable instead of something the next person has to
rediscover from scratch.

This applies beyond this file — [ADR-003](architecture-decision-record.md#adr-003--let-the-dev-container-run-ahead-of-the-ci-runner)
names what retires it, and the `@nuxtjs/mdc` declaration in
[divergence-from-the-template.md](divergence-from-the-template.md#toolchain--dependency-management-net-new)
names both what to
watch in the meantime and what retires it.
