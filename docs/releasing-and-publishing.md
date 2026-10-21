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
- **Protect `main` and the release tags with rulesets.** Configured as the shared
  [repository conventions](https://github.com/iglootools/common/blob/main/guidelines/project-setup/repository.md#protect-the-default-branch-and-release-tags)
  describe: `main` cannot be deleted or force-pushed, changes go through a pull request
  merged with a merge commit, and the `ci` check must pass first; `v*` tags cannot be
  deleted or moved, so a published version keeps pointing at the commit it was built from.

  ```bash
  gh api --method POST repos/iglootools/alberta-hiking-resources/rulesets --input - <<'JSON'
  {
    "name": "main",
    "target": "branch",
    "enforcement": "active",
    "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
    "rules": [
      { "type": "deletion" },
      { "type": "non_fast_forward" },
      { "type": "pull_request", "parameters": {
          "required_approving_review_count": 0,
          "dismiss_stale_reviews_on_push": false,
          "require_code_owner_review": false,
          "require_last_push_approval": false,
          "required_review_thread_resolution": false,
          "allowed_merge_methods": ["merge"] } },
      { "type": "required_status_checks", "parameters": {
          "strict_required_status_checks_policy": false,
          "do_not_enforce_on_create": false,
          "required_status_checks": [{ "context": "ci", "integration_id": 15368 }] } }
    ]
  }
  JSON

  gh api --method POST repos/iglootools/alberta-hiking-resources/rulesets --input - <<'JSON'
  {
    "name": "release tags",
    "target": "tag",
    "enforcement": "active",
    "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
    "rules": [{ "type": "deletion" }, { "type": "update" }]
  }
  JSON
  ```

  To change an existing ruleset, `PUT` the same payload to
  `repos/iglootools/alberta-hiking-resources/rulesets/<id>` (ids from `gh api repos/iglootools/alberta-hiking-resources/rulesets`).
  Verify what GitHub actually enforces — an `active` ruleset with an empty `include` list
  protects nothing and looks enabled all the same:

  ```bash
  gh api repos/iglootools/alberta-hiking-resources/rules/branches/main -q '[.[].type]'
  # expect: ["deletion","non_fast_forward","pull_request","required_status_checks"]
  ```

  `ci` must keep reporting on every pull request. It runs on every push (`on: push` in
  `ci.yml`), which covers pull request branches; a `paths` or `branches` filter added there
  would leave the pull requests it skips unmergeable.

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
