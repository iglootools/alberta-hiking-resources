#!/usr/bin/env bash
#
# Provisions the dev container. Runs once, at container creation, from the
# workspace root. See .devcontainer/devcontainer.json.
set -euo pipefail

# `build-essential` and `python3` are insurance for node-gyp, not a current
# requirement -- measured, not assumed. better-sqlite3 (@nuxt/content's SQLite
# driver) installs with `prebuild-install || node-gyp rebuild --release`, and on
# the Node version currently pinned in mise.toml the prebuilt binary exists, so
# the fallback never runs; building this image without them succeeds today.
#
# They stay because the fallback is one Node bump away from mattering: whenever
# renovate moves `node` in mise.toml ahead of better-sqlite3's published
# prebuilds, node-gyp runs and needs make, g++ and python3. The base image has
# the first two but not python3, so the failure would land on whoever opens the
# container next, as an opaque gyp error during creation -- the worst possible
# place for it, given the whole point of this file is that contributors do not
# have to debug a toolchain. One apt-get, cached into Codespaces prebuilds, buys
# that away. Drop them if better-sqlite3 ever ships pure-JS or WASM, or if
# @nuxt/content stops defaulting to it.
#
# `gnupg` is needed below, to dearmor mise's signing key.
sudo apt-get update
sudo apt-get install -y --no-install-recommends build-essential python3 gnupg

# Install mise from its own apt repository rather than `curl https://mise.run | sh`,
# so the download is GPG-verified and managed like any other system package.
#
# It has to be mise's repository: Ubuntu does not package mise at all. There is no
# `mise` in 26.04's main, universe, restricted or multiverse -- check with
# `apt-cache policy mise` on a clean image before assuming otherwise.
#
# The trade-off is that this cannot pin a version: the repository's index carries
# only the current release, so `apt-get install mise=<version>` starts failing the
# day that version is superseded. The container therefore tracks whatever mise is
# latest at build time. That is acceptable here precisely because mise is not the
# thing being pinned -- it is the thing that *reads* the pins. Node and pnpm come
# from mise.toml and mise.lock and are identical no matter which mise installs
# them. If mise itself ever needs pinning, switch to downloading a specific
# release binary and verifying it against that release's SHASUMS256.txt.
#
# `dpkg --print-architecture` matters: Codespaces is amd64 and Docker on Apple
# Silicon is arm64, and mise publishes both. A hardcoded arch would leave the
# repository empty on the other one.
sudo install -dm 755 /etc/apt/keyrings
curl -fsSL https://mise.jdx.dev/gpg-key.pub \
  | sudo gpg --dearmor -o /etc/apt/keyrings/mise-archive-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=$(dpkg --print-architecture)] https://mise.jdx.dev/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/mise.list > /dev/null

sudo apt-get update
sudo apt-get install -y mise
sudo rm -rf /var/lib/apt/lists/*

# mise refuses to read a config file it has not been told to trust, which would
# otherwise prompt interactively on a container nobody is watching.
mise trust
mise install
mise run install

# Put the pinned toolchain on PATH for interactive shells too, so `pnpm`, `node`
# and `mise run <task>` work in the container's terminal.
if [ -f "$HOME/.bashrc" ]; then
  # shellcheck disable=SC2016  # written unexpanded, for the shell to run at startup
  echo 'eval "$(mise activate bash)"' >> "$HOME/.bashrc"
fi

if [ -f "$HOME/.zshrc" ]; then
  # shellcheck disable=SC2016  # written unexpanded, for the shell to run at startup
  echo 'eval "$(mise activate zsh)"' >> "$HOME/.zshrc"
fi
