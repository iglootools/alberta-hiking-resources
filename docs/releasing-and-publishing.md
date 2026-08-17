# Releasing and Publishing

The site is deployed to [GitHub Pages](https://nuxt.com/deploy/github-pages) via
an automated release pipeline.

## Release flow

A release is **started by hand**, and everything after that is automatic:

1. [`release.yml`](../.github/workflows/release.yml) is dispatched manually
   (`gh workflow run release.yml`). It runs
   [semantic-release](https://github.com/semantic-release/semantic-release), configured in
   [.releaserc.json](../.releaserc.json) with `branches: ["main"]`, which analyses the commits
   and creates a version tag.
2. [`publish.yml`](../.github/workflows/publish.yml) then runs `mise run build-pages`
   (`nuxt build --preset github_pages`) and deploys the result to GitHub Pages.

**The push trigger is deliberately commented out** in `release.yml`, so merging to `main` does
*not* cut a release on its own. Uncomment the `push: branches: [main]` block to make releases
automatic.

What links step 1 to step 2 is worth knowing, because the obvious reading is wrong. `publish.yml`
does listen for `push: tags: ['v*']`, but a tag created by a workflow using `GITHUB_TOKEN` does
not trigger other workflows — so that path never fires for an automated release. The one that
actually fires is `workflow_run` on **release** completing. The tag trigger is what covers a tag
pushed by hand.

## One-time GitHub settings

- **Settings → Pages → Source** must be set to **"GitHub Actions"**.

## Running them by hand

Cut a release (this is the normal path, per the flow above):

```bash
gh workflow run release.yml
gh run list --workflow release.yml
```

Re-deploy an existing tag without cutting a new release:

```bash
gh workflow run publish.yml --ref <tag>
gh run list --workflow publish.yml
```

## Further reading

- Nuxt [deployment documentation](https://nuxt.com/docs/getting-started/deployment)
- Nuxt [GitHub Pages integration](https://nuxt.com/deploy/github-pages)
