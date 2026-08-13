# Setup Development Environment

There are two ways to work on this site. A third — StackBlitz — does not
currently work; see [below](#stackblitz-does-not-currently-work) for why, so that
nobody has to rediscover it.

| | What it is | Setup | Can run |
|---|---|---|---|
| [Dev container](#dev-container-codespaces-local-docker) | A real Linux container | Sign in, a few minutes to build | Everything |
| [Local](#local-setup) | Your own machine | Install mise | Everything |
| [StackBlitz](#stackblitz-does-not-currently-work) | Node compiled to WebAssembly, in a browser tab | — | **Nothing — blocked** |

## Dev container (Codespaces, local Docker)

**[Open in GitHub Codespaces →](https://codespaces.new/iglootools/alberta-hiking-resources)**

A full Linux container defined by
[.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json), so every
native dependency compiles and the whole `mise run ci` pipeline — build, lint,
typecheck — runs exactly as it does locally and in CI.

It installs mise and then defers to [mise.toml](../mise.toml) and
[mise.lock](../mise.lock) for the Node and pnpm versions, so it resolves the same
toolchain a local checkout does rather than pinning a second copy that could
drift. Provisioning is in [.devcontainer/setup.sh](../.devcontainer/setup.sh).

Once it finishes building, the dev server starts with `mise run dev` and port
3000 is forwarded automatically.

The same file also works with the VS Code
[Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
extension against local Docker — *Dev Containers: Reopen in Container*. Note that
Codespaces bills compute against *your* GitHub account's monthly free quota;
local Docker does not.

### Why CodeSandbox is not listed

It used to be, and the link no longer works. CodeSandbox retired its Repositories
feature — the `codesandbox.io/p/github/...` flow that opened a git repo directly —
on 15 July 2026, having stopped new imports that April. Devboxes still exist, but
without repo import there is no "open this project" entry point to offer. Be aware
that the URL still returns HTTP 200: it is a single-page app that renders the error
client-side, so a link check will not catch this.

A second problem would bite even if that came back. `std-env` reports the
`codesandbox` provider whenever `CODESANDBOX_HOST` or `CODESANDBOX_SSE` is set, and
`nuxt-og-image` maps that provider to the same profile it uses for WebContainer,
switching to a WebAssembly renderer. Building with `CODESANDBOX_HOST` set locally
reproduces it: all 56 prerendered OG images return 500 and the build aborts with
"Exiting due to prerender errors". Adding `@takumi-rs/wasm` resolves the import but
does not fix it — the WASM path then fails inside `unwasm`.

That mapping is an upstream assumption that CodeSandbox means a browser sandbox,
which a Devbox is not; it is a real VM where the default native renderer works.
Overriding `nuxt-og-image`'s compatibility for that provider is the likely fix, and
is untested.

## Local setup

### Prerequisites

1. Install [mise](https://mise.jdx.dev/getting-started.html) — it pins the Node and
   pnpm versions ([mise.toml](../mise.toml)) and acts as the task runner.

2. Clone [common-guidelines](https://github.com/iglootools/common-guidelines) as a
   sibling directory:

    ```bash
    # From the parent directory of alberta-hiking-resources (e.g. iglootools/)
    git clone git@github.com:iglootools/common-guidelines.git
    ```

   This is what makes the `@../common-guidelines/...` imports in
   [CLAUDE.md](../CLAUDE.md) resolve, so Claude Code loads the shared coding and
   tooling guidelines. Only needed if you use Claude Code — nothing in `mise run
   ci` reads it, and the dev container does not clone it either.

### Install and run

1. Install the toolchain and dependencies:

    ```bash
    mise install
    mise run install
    ```

2. Start the development server:

    ```bash
    mise run dev
    ```

   The site is served at `http://localhost:3000`.

## StackBlitz (does not currently work)

[.stackblitzrc](../.stackblitzrc) is kept in the repo and configured to get as far
as it can, but **StackBlitz cannot run this project today**, and no change here can
fix it. This is written down so the investigation does not have to be repeated.

StackBlitz does not run a container or a virtual machine. It runs a
reimplementation of Node.js, compiled to WebAssembly, inside the browser tab. That
is what makes it start in seconds with no account, and it is also why native code
and parts of the Node platform behave differently there.

**`@nuxt/content` keeps its parsed content in SQLite, and a WebContainer offers no
working SQLite to give it.** Two unrelated gaps close every available route, which
is why fixing either one alone gets you nowhere.

**Gap one: native addons are refused.** WebContainer loads only addons compiled to
WebAssembly. Ones that are compile fine — `rolldown` and `oxc-parser` fetched
`wasm32-wasi` builds during these runs and worked. A native `.node` binary is
rejected by policy, not for want of a file:

```
Error: Cannot load native addon because loading addons is disabled:
  node_modules/sqlite3/build/Release/node_sqlite3.node
  code: 'ERR_DLOPEN_DISABLED'
```

That rules out both of Content's addon-based drivers:

- `better-sqlite3` — native addon, cannot be loaded.
- `sqlite3` — also a native addon, despite its reputation. Its binary can even be
  *obtained* (see below) and still cannot be loaded.
- There is no built-in `sqlite3` to fall back on either: with the package removed,
  `require('sqlite3')` is a plain `MODULE_NOT_FOUND`.

**Gap two: `node:sqlite` is a stub.** Content's `native` connector needs no addon
at all, so gap one does not apply to it — and it still fails, because
WebContainer's built-in module is hollow. `DatabaseSync` can be constructed, and
its prototype contains only `constructor`; no `exec`, no `prepare`, nothing:

```
node -e "const s=require('node:sqlite'); const d=new s.DatabaseSync(':memory:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(d)).join(', '))"
→ constructor
```

Tried with `content.experimental.sqliteConnector: 'native'` set temporarily, it
otherwise does exactly what it should: no addon involved, no `sqlite3` prompt,
clean install, and Nuxt 4.5.2 boots. It dies on `getDB().exec is not a function`.
That same missing method is why `npx pnpm@11` fails with
`this.db.exec is not a function` — pnpm 11 backs its store index with `node:sqlite`
too. One stub, two failures that looked unrelated. (That setting is not in the repo;
see the end of this section.)

Note that [Nuxt Content's documentation](https://content.nuxt.com/docs/getting-started/configuration)
states the `sqlite3` connector "Works in Node environments, GitHub CI, and
StackBlitz". On this WebContainer build it does not. Advice found online repeats
that claim and describes `sqlite3` as the "pure JavaScript" driver — it is not; it
is a native addon that ships prebuilt `.node` binaries, exactly like
`better-sqlite3`. Do not take any of it as evidence the problem is on our side, and
do not spend time on the usual suggestion of setting
`content.experimental.sqliteConnector: 'sqlite3'`: `@nuxt/content` already selects
that connector whenever it detects a WebContainer, which is why it offers to
install `sqlite3` unprompted. Both were tested directly.

Tried on 2026-08-07, on WebContainer Node v22.22.3 with its bundled pnpm 8.15.6.
First, getting a usable package manager:

| Attempt | Result |
|---|---|
| The bundled pnpm 8.15.6 | `ERR_PNPM_INVALID_WORKSPACE_CONFIGURATION` — rejects [pnpm-workspace.yaml](../pnpm-workspace.yaml) for having no `packages:` field |
| corepack, which would honour `packageManager` | Not present in WebContainer |
| `npm i -g pnpm@11.15.1` | `EACCES` — no writable global prefix and no sudo |
| `npx pnpm@11.15.1` | `this.db.exec is not a function` — pnpm 11 backs its store index with `node:sqlite` |
| `npx pnpm@10` | Reads `packageManager` and self-upgrades to pnpm 11, then crashes inside StackBlitz's own injected `/home/.pnpm/.pnpmfile.cjs` |

pnpm is squeezed from both sides: `packages:` became optional only in pnpm 10 and
`allowBuilds` is pnpm 11, so **this repo needs pnpm 10 or newer**, while the newest
pnpm WebContainer can execute is older. `packageManager: pnpm@11.15.1` in
[package.json](../package.json) does not help — WebContainer ignores it, and pnpm
10 honours it only by trying to upgrade into the version that cannot run.

**npm gets past all of that, and still fails.** This is the part worth knowing,
because it shows the package manager was never the real problem:

| Attempt | Result |
|---|---|
| `npm install --legacy-peer-deps` | Installs. `--legacy-peer-deps` is required — three unmet peers (`oxc-parser`, `unplugin`, `cac`) that pnpm tolerates and npm rejects |
| `nuxt prepare` postinstall | `@nuxt/content` asks to install `sqlite3`, then delegates to `nypm`, which reads `packageManager`, runs `pnpm add sqlite3`, and fails with `ERR_PNPM_ADDING_TO_ROOT` |
| `npm install --ignore-scripts`, then `sqlite3` by hand, then `nuxt dev` | **Nuxt 4.5.2 boots and the dev server starts**, then dies on `Could not locate the bindings file` |
| The same, plus `sqliteConnector: 'native'` | **Furthest anything reached.** Clean install, no `sqlite3` prompt, no addon, Nuxt boots — then `getDB().exec is not a function`, the `node:sqlite` stub |

That last failure is worth following through, because the obvious reading of it is
wrong. `sqlite3` 6.x ships prebuilt N-API binaries, so no compiler is needed — but
`prebuild-install` fetches them from GitHub releases, and **GitHub is unreachable
from WebContainer** (`socket hang up`), while `registry.npmjs.org` is fine. It
reports that as a *warning*, so the install appears to succeed and silently leaves
no binding.

That obstacle is solvable — the binary downloads fine from a mirror:

```bash
npm_config_sqlite3_binary_host_mirror=https://registry.npmmirror.com/-/binary/sqlite3
```

With the binary in place, `require('sqlite3')` still fails, with
`ERR_DLOPEN_DISABLED`. That is the wall. Fetching the binary was necessary and not
sufficient.

[.stackblitzrc](../.stackblitzrc) therefore boots via npm, which is what gets it
from failing instantly to reaching the database. That is as far as configuration
can take it. Note npm cannot read `pnpm-lock.yaml`, so it resolves fresh from
`package.json` ranges every boot, bypassing the 14-day `minimumReleaseAge` policy
in [renovate.json](../renovate.json) — tolerable only because nothing can actually
start this way, and a problem to solve before anyone relies on it.

The remaining gap is deliberately not worked around. The only route left is
pointing `@nuxt/content` at a WebAssembly database such as PGlite, which would have
StackBlitz running a different database engine than everyone else, behind
environment-specific branching in [nuxt.config.ts](../nuxt.config.ts) that this
project does not have. That is no longer previewing the site; it is previewing a
variant of it. Nothing in CI could test it either.

Weigh the payoff too: the "Edit this page" link already covers drive-by content
fixes without a sandbox, and the dev container covers anyone who wants a real
preview. StackBlitz would add convenience, not capability.

**Retest** with one command in a StackBlitz terminal. `node:sqlite` is the signal
to watch, because it would make native addons unnecessary altogether:

```bash
node -e "const {DatabaseSync}=require('node:sqlite'); new DatabaseSync(':memory:').exec('create table t(x)'); console.log('node:sqlite works')"
```

If that prints, WebContainer has implemented `node:sqlite` and this is worth
reopening — `npx pnpm@11` should start working at the same moment, for the same
reason. Reaching it would then need `content.experimental.sqliteConnector: 'native'`
in [nuxt.config.ts](../nuxt.config.ts), since Content otherwise stays on `sqlite3`
in a WebContainer.

The more likely fix is the other one: WebContainer allowing addons compiled to
WebAssembly to satisfy `sqlite3`. Nothing needs changing for that at all —
[.stackblitzrc](../.stackblitzrc) already installs `sqlite3` with its binary, and
Content already selects that connector on its own here, so opening the project
would simply work.

Note a working `node:sqlite` clears only the database. The pnpm obstacles above are
separate, and the lockfile caveat still applies — solve that before treating
StackBlitz as supported. If it all works, restore the badge in
[README.md](../README.md) and the entry on the in-site
[contributing page](../content/1.getting-started/2.contributing.md).

Everything else in the stack copes fine, which is worth preserving: `std-env`
reports the `stackblitz` provider, `nuxt-og-image` swaps `@takumi-rs/core` for its
WebAssembly build, and `rolldown` and `oxc-parser` fetch `wasm32-wasi` builds on
their own — all observed working in the runs above. That is why
[nuxt.config.ts](../nuxt.config.ts) carries no `if (webcontainer)` branches, and it
should stay that way; if something ever does need overriding, prefer `provider`
from `std-env` over hand-rolled detection.

`content.experimental.sqliteConnector` is likewise left unset, which is what keeps
that true. Content defaults to `better-sqlite3` and switches to `sqlite3` by itself
in a WebContainer, so pinning either would only override a decision upstream
already makes — and would stop tracking it if their recommendation changes.

The exception worth knowing about is `native`, which uses Node's built-in
`node:sqlite` and so needs no addon anywhere. A full `mise run ci` on the pinned
Node 26 passes with it, `better-sqlite3` never loaded, which would let that
dependency go along with the `build-essential` and `python3` that
[.devcontainer/setup.sh](../.devcontainer/setup.sh) installs to build it. It is not
adopted because it would apply everywhere rather than only where it helps, and
`node:sqlite` is still flagged experimental in Node. Worth revisiting once it is
not.

## Editor setup

### VS Code

The extensions worth having — MDC syntax for `content/`, Vue (Volar), ESLint, and
mise — are declared in the repo rather than listed here, so there is no
hand-maintained copy to fall out of date. They live in two files, which do
different things:

| File | Effect |
|---|---|
| [.vscode/extensions.json](../.vscode/extensions.json) | **Recommends.** VS Code shows a "this workspace has recommended extensions" prompt. Nothing is installed, and the prompt can be dismissed permanently. |
| [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) (`customizations.vscode.extensions`) | **Installs.** Anything listed is installed automatically when the container is created. |

An extension appearing in both is not redundant: the first suggests it to someone
working locally, the second guarantees it inside the container.

What belongs in that list follows the shared rule in
[VSCode setup](https://github.com/iglootools/common-guidelines/blob/main/tooling.md#vscode):
**every extension a committed setting depends on belongs in `extensions.json`**,
because a setting whose extension is absent is not an error — it is a silent no-op,
and whoever cloned the repo cannot tell it apart from a working setup.

This project commits no `.vscode/settings.json`, so today the four entries are there
for capability rather than to back a setting. Apply the rule the moment one is added:
a `mise.*` key needs `hverlin.mise-vscode` present to have a reader at all, and the
same holds for any `vue.*` or `eslint.*` key.

Both files list the same four extensions, and the container still needs its own
copy, because a dev container splits the editor in half. The UI runs on your
machine, but language servers and linters run *inside* the container, since that
is where the source and `node_modules` are — and extensions installed on your
machine do not follow you across that boundary. A recommendation would not help
there either, as there is nobody present to accept the prompt while the container
is being created. Without the install list, a fresh container gives you an editor
with no Vue intelligence, no ESLint feedback, and no MDC highlighting in
`content/`.

Keep the two lists in step when changing either.

This applies to the dev container only. StackBlitz has its own editor and ignores
both files.

## AI assistant setup (MCP)

The project exposes a set of [Model Context Protocol](https://modelcontextprotocol.io)
servers that give an AI coding assistant accurate, up-to-date knowledge of Nuxt
and of this app specifically — so it writes correct code instead of relying on
stale training data.

> These servers are a **development aid** for the engineer working on the repo.
> They are unrelated to the runtime MCP server the site itself ships via
> `@nuxtjs/mcp-toolkit` (the tools under [server/mcp/](../server/mcp/)), which
> serves the published hiking content to end users.

### Available servers

| Server      | Transport      | Endpoint                          | What it gives the assistant                                                                 |
| ----------- | -------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `nuxt`      | SSE (local)    | `http://localhost:3000/__mcp/sse` | This running app's live structure: routes, components, auto-imports, resolved Nuxt config.  |
| `nuxt-docs` | HTTP (hosted)  | `https://nuxt.com/mcp`            | Current Nuxt 4 documentation, so answers track the version this project uses.               |
| `nuxt-ui`   | HTTP (hosted)  | `https://ui.nuxt.com/mcp`         | Nuxt UI component documentation (props, slots, usage).                                       |

The `nuxt` server is provided by the dev-only [`nuxt-mcp-dev`](https://github.com/antfu/nuxt-mcp)
module, registered in [nuxt.config.ts](../nuxt.config.ts). It is **only reachable
while the dev server is running** (`mise run dev`); the two hosted servers are
always available. `nuxt-mcp-dev` is excluded from the production build.

### Claude Code

Claude Code reads the project-scoped [.mcp.json](../.mcp.json) at the repo root.
No manual configuration is needed — just:

1. Run `mise run dev` so the local `nuxt` server is reachable.
2. Open the project in Claude Code (reload the window if it was already open) so
   it picks up `.mcp.json`.
3. Approve the three servers when Claude Code prompts to trust them (it always
   asks before using MCP servers defined in a project file).

Verify with `/mcp` inside Claude Code — all three should show as connected.

[CLAUDE.md](../CLAUDE.md) points Claude at these servers rather than at its training
data, and imports the shared [common-guidelines](https://github.com/iglootools/common-guidelines)
via `@../common-guidelines/...`. Those imports resolve only with that repo cloned as
a sibling directory — step 2 of [Prerequisites](#prerequisites) above.

No Claude Code plugins are installed here. If one is ever added, install it with
`--scope project` and commit `.claude/settings.json`, per
[Claude Code setup](https://github.com/iglootools/common-guidelines/blob/main/tooling.md#claude-code)
in the shared guidelines — a user-scope install keeps working locally, which is what
makes the shared half easy to leave untracked and never notice.

### VS Code (native / Copilot)

VS Code's built-in MCP support reads [.vscode/mcp.json](../.vscode/mcp.json),
which `nuxt-mcp-dev` keeps in sync automatically on each `mise run dev`. Enable
MCP in your VS Code settings, reload, and the same three servers are available
to Copilot's agent mode.

## Next steps

See [building-and-testing.md](building-and-testing.md) for the full `mise` task
reference plus build, lint, and CI details, and
[releasing-and-publishing.md](releasing-and-publishing.md) for the deployment
pipeline.
