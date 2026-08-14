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
reports none. Leaving it in place after that would pin a floor upstream is managing itself, per
[Do not pin what upstream decides per environment](#do-not-pin-what-upstream-decides-per-environment).

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

### `@nuxtjs/mdc` is declared without being imported

[package.json](../package.json) declares `@nuxtjs/mdc` at the template's `^0.23.0`
even though nothing here imports it. This runs against
[Declare every package you import](#declare-every-package-you-import) from the other
end — the rule is about not *leaving out* what you import, and says nothing about
carrying what you do not — and against the trimming of unused template deps recorded
in [architecture.md](architecture.md#toolchain--dependency-management-net-new).

It is deliberate, and it is what the
[upstream template](https://github.com/nuxt-ui-templates/docs) does. The `@nuxtjs/mdc`
module adds ten `@nuxtjs/mdc > <pkg>` entries to `vite.optimizeDeps.include` for its
own transitive deps, and Vite resolves the left-hand side from the project root. The
package reaches this app only through `@nuxt/content`, so without a declaration all
ten fail and every dev run reports `NUXT_B7002`. `shamefullyHoist` masked that until
it was dropped in `08d20924`.

**The known wart.** `@nuxt/content` requires `^0.22.2`, which `^0.23.0` does not
satisfy, so the tree holds two copies and the one Vite pre-bundles against is not the
one that runs:

```
@nuxtjs/mdc@0.22.2   ← what @nuxt/content actually loads
@nuxtjs/mdc@0.23.1   ← our declaration, linked at the root, what Vite resolves
```

This is harmless as long as the two agree on the ten packages being pre-bundled, and
today they agree exactly — `remark-gfm ^4.0.1`, `remark-mdc ^3.11.1`, `parse5 ^8.0.1`
and the rest are identical in both. Accepted on that basis, and because staying with
the template matters more here than the theoretical gap. A one-package
`publicHoistPattern` avoided it by linking the single instance already in the tree
(`b35f109c`, reverted in favour of this).

**Watch for** those ranges diverging, which is the thing that would turn the wart
into a real bug — a Renovate bump on either side is the likely trigger. Compare with:

```bash
for v in 0.22.2 0.23.1; do npm view @nuxtjs/mdc@$v dependencies --json; done
```

**Retires when** `@nuxt/content`'s range admits the version declared here, collapsing
the tree to one copy and making this an ordinary dependency. Check with
`npm view @nuxt/content dependencies.@nuxtjs/mdc`, then confirm with
`ls -d node_modules/.pnpm/@nuxtjs+mdc@* | wc -l` returning 1.

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
