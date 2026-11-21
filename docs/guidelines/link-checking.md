# Link Checking

The measurements behind the link-checker exception in
[docs/guidelines.md](../guidelines.md#do-not-call-the-shared-link-checker-until-the-docs-need-one).
Read it before setting up a link checker here, or when re-evaluating that
exception.

The exception rests on where the links are. Of 759 link instances in tracked
markdown, 693 are in `content/` — per-trail links out to weather, air-quality,
map and social sites — against 66 in `docs/` and `README.md` combined. Checking
that population weekly would report on other people's websites, not on this
repository:

| | |
|---|---|
| 156 instances | meteoblue, AccuWeather and IQAir, which serve 403/429 to any non-interactive client even carrying a browser `User-Agent`. Blocked rather than slow, so no timeout or retry setting reaches them and they would have to be excluded outright |
| 16 instances | trailforks, peakbagger, MEC, ExpertVoice, REI and nuxt.com, blocking the same way, one URL each |
| 6 instances | `localhost:3000` dev-server URLs in `docs/`, unreachable from CI by definition |
| the remainder | consumer sites whose URLs change on their own schedule. A weekly issue would mostly track their churn |

Two findings from measuring rather than assuming, both worth keeping because
they are what a re-evaluation should re-test:

- **Nothing is actually broken.** All 667 unique URLs in tracked markdown were
  probed, and every failure was re-probed serially with a browser `User-Agent`:
  **zero 404s**. There is no present problem for a checker to have caught.
- **Concurrency manufactures failures here.** Probing in parallel produced 73
  rate-limit failures; retried serially, 14 of them — including the only 404 in
  the whole run — came back with a 200. lychee checks in parallel by default, so
  it would report failures that are artifacts of its own request rate on top of
  the genuine exclusions above.
