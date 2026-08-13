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

### The dev container runs ahead of the CI runner

[.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) pins
`base:ubuntu26.04` while CI's `ubuntu-latest` still resolves to 24.04, so the two environments
are deliberately not identical.

The divergence is narrow by design: everything determining what the app runs on — Node, pnpm —
comes from `mise.lock` and is identical in both. The base image contributes glibc, curl, and the
C++ toolchain that compiles `better-sqlite3`, and that binary never leaves the container.

**Retires when** GitHub moves `ubuntu-latest` to 26.04. If a native module ever builds in the
container but fails in CI, this is the first place to look, and pinning back to `ubuntu-24.04`
is the fix.

### `@nuxtjs/mdc` is hoisted rather than declared

[pnpm-workspace.yaml](../pnpm-workspace.yaml) links exactly one package into the root
`node_modules` via `publicHoistPattern`. This is a narrow exception to
[Declare every package you import](#declare-every-package-you-import) — and not a
reprise of `shamefullyHoist`, which flattened the whole root: naming one package
leaves every other undeclared import failing at build time, as intended.

The `@nuxtjs/mdc` module adds ten `@nuxtjs/mdc > <pkg>` entries to
`vite.optimizeDeps.include` for its own transitive deps, and Vite resolves the
left-hand side from the project root. The package reaches this app only through
`@nuxt/content`, so on a strict tree all ten fail and every dev run reports
`NUXT_B7002`. `shamefullyHoist` masked this until it was dropped in `08d20924`.

**How the template avoids it.** [nuxt-ui-templates/docs](https://github.com/nuxt-ui-templates/docs)
declares `@nuxtjs/mdc` as a direct dependency, which puts it in the root
`node_modules` and resolves the entries with no pnpm configuration at all. That is
the simpler fix and the one to adopt when it becomes safe. It is not safe yet,
because the declared version is a *second* version: the template pins `^0.23.0`
while `@nuxt/content@3.15.2` requires `^0.22.2`, so its lockfile carries two copies
of `@nuxtjs/mdc` and Vite pre-bundles against the copy that does not run. It
currently gets away with it — the ten transitive ranges are byte-identical between
0.22.2 and 0.23.0, so both copies pre-bundle the same packages — but nothing keeps
that true, and a Renovate bump on our side would be the thing to break it. A hoist
carries no version of its own and links the single instance already in the tree.

**Retires when** either of these holds:

- The entries resolve unaided — upstream stops using the `pkg > subpkg` form, or Nuxt
  resolves it from the module's own location. Retest by deleting the block, running
  `CI=true pnpm install`, then `mise run dev`, and watching for `NUXT_B7002`.
- `@nuxt/content`'s range widens to admit the version we would declare, making one
  copy the only outcome. Check with
  `npm view @nuxt/content dependencies.@nuxtjs/mdc`, then switch to the template's
  approach: drop `publicHoistPattern` and add `@nuxtjs/mdc` to `dependencies`.
  Confirm with `ls -d node_modules/.pnpm/@nuxtjs+mdc@* | wc -l` returning 1.

### The license is CC BY-SA 4.0, not Apache 2.0

nbkp and photree ship Apache 2.0. This repository is
[CC BY-SA 4.0](../LICENSE) because its substance is *content* — hiking information written in
Markdown — rather than code. The Nuxt UI Docs template it is built on is MIT.

## Rules of this project's own

### Declare every package you import

There is no `shamefullyHoist`, and adding one back is not the fix for an unresolved import —
declaring the dependency is.

This one is load-bearing rather than stylistic. `shamefullyHoist` was carried over from the
pre-Nuxt-4 `.npmrc` purely so undeclared transitive imports would resolve, and it caused a
full-site outage: an h3 v2 RC hoisted to the root, `@nuxt/content` picked it up, every content
query threw, and every page 404'd (`790d3661`). A flat root also means the version you compile
against is whatever hoist order happened to lift — a stale local `node_modules` was observed
resolving a different major of `h3` than a clean `pnpm install --frozen-lockfile`, breaking
`typecheck` locally while CI stayed green.

With a strict tree, an undeclared import fails at build time instead. See
[architecture.md](architecture.md#toolchain--dependency-management-net-new) for the four
dependencies that had to be declared to make dropping it possible.

### `compatibilityDate` is behaviour, not a version

Raise it deliberately, alongside a build-and-prerender check. Never let it be bumped
automatically, and never treat it as a routine version update: it changes Nuxt and Nitro
defaults rather than a dependency version.

### Do not pin what upstream decides per environment

Where a module already makes an environment-dependent choice correctly, leave it unset rather
than restating it. Pinning it overrides a decision upstream is making well *and* stops tracking
that decision if their recommendation changes.

The worked example is `content.experimental.sqliteConnector` in
[nuxt.config.ts](../nuxt.config.ts): `@nuxt/content` defaults to `better-sqlite3` and switches
to `sqlite3` by itself in a WebContainer. Setting either value explicitly would fix in place
something that is currently self-correcting. The comment there also records why `native` is
tempting and what would have to change to adopt it.

Related: prefer `provider` from `std-env` over hand-rolled environment detection, and keep
`nuxt.config.ts` free of `if (webcontainer)` branches.

### Icons: extend the scan, never replace its globs

`icon.clientBundle.scan` must stay on — without it, only the icons `@nuxt/ui` registers itself
are bundled, and every other icon is fetched from `api.iconify.design` at render time, leaving a
statically prerendered site dependent on a third-party host.

Do not set `globInclude` to add an extension. It *replaces* the module's default globs rather
than extending them, pinning a copy of upstream's internals that goes stale silently when they
add one. The defaults already cover `.vue` and `.md`, which matters here because most icons are
declared in content frontmatter. They skip `.ts`, so icons declared only in `app.config.ts` are
listed explicitly in `clientBundle.icons` instead. That list is not guaranteed complete by
anything, but the failure is loud: an icon that is neither scanned nor listed warns on every
render.

### Write down the dead ends, with a retest

Where an investigation concludes that something cannot work, record the finding *and* the
command that would prove it has changed, plus the signal to watch. The
[StackBlitz section](setup-development-environment.md#stackblitz-does-not-currently-work) and
[Why CodeSandbox is not listed](setup-development-environment.md#why-codesandbox-is-not-listed)
are the worked examples. This is the same principle as naming the condition that retires an
exception: it makes the conclusion re-evaluatable instead of something the next person has to
rediscover from scratch.
