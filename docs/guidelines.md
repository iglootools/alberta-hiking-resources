# Project-Specific Guidelines

For general coding and tooling guidelines, see the
[common guidelines](https://github.com/iglootools/common-guidelines). Those are defaults, not
dogma: this project may deviate or add rules of its own, **provided the deviation and its
reasoning are documented** — project-wide ones here, local ones in a comment at the point of
deviation.

Most of this project's deviations are local, and so live as comments where they apply. This file
does not restate them; it indexes them, so there is one place to find them all, and holds the
project-wide rules that have no single point of deviation.

## Which shared guidelines apply

`coding.md` and `tooling.md` apply and are imported by [CLAUDE.md](../CLAUDE.md).

**`python.md` does not.** Nothing here is Python, which also puts three parts of `tooling.md`
out of scope rather than merely unmet:

| Shared section | Why it does not apply |
|---|---|
| `tooling.md` → New Project Setup → Python Projects | uv/hatchling/ruff have no counterpart here; the stack is pnpm + mise |
| `tooling.md` → IDE → Pyright environment resolution | no `.venv` and no `[tool.pyright]` to pin |
| `tooling.md` → IDE → Claude Code → Pyright LSP plugin | Python-specific. No LSP plugin is installed for this project |

The last one leaves a real gap — an assistant here has no import graph to resolve symbols
against. The `.mcp.json` servers cover the adjacent problem instead: they ground answers about
Nuxt and about this app's resolved config in current reality rather than training data. See
[setup-development-environment.md](setup-development-environment.md#ai-assistant-setup-mcp).
Revisit if a Vue/TS LSP plugin becomes available at project scope.

The `--scope project` rule from that same section still applies in full, should any plugin ever
be added: install it into the repository's `.claude/settings.json` and commit that file.

## Project-wide deviations

All three concern the shared 14-day `minimumReleaseAge` supply-chain measure and the dependency
policy around it, defined in `tooling.md` → New Project Setup → All Projects.

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

## Rules of this project's own

### Write down the dead ends, with a retest

Where an investigation concludes that something cannot work, record the finding *and* the
command that would prove it has changed, plus the signal to watch. The
[StackBlitz section](setup-development-environment.md#stackblitz-does-not-currently-work) and
[Why CodeSandbox is not listed](setup-development-environment.md#why-codesandbox-is-not-listed)
are the worked examples. This is the same principle as naming the condition that retires an
exception: it makes the conclusion re-evaluatable instead of something the next person has to
rediscover from scratch.

This applies to the ADR too — ADR-004 and ADR-008 each name what retires them, and ADR-008 names
what to watch in the meantime.
