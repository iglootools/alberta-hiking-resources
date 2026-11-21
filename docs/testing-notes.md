# Testing Notes

Manual checks for the SEO / social-preview surface area.

## Open Graph images

Content pages use auto-generated OG images via `nuxt-og-image` and the Takumi
renderer, using the **`Docs` community template**
(`app/components/OgImage/Docs.takumi.vue`). The landing page uses a custom
static image (`public/images/og.png`) for a more branded social preview.

> **The `Docs` template is _ejected_, and must stay ejected.** nuxt-og-image v6
> only ships community templates for dev — production builds fail with
> _"Community template … must be ejected before production use"_ unless a local
> copy exists. `Docs.takumi.vue` is that ejected copy (created with
> `npx nuxt-og-image eject Docs`); we pass `title`/`description`/`site` plus the
> brand-green `primaryColor`/`primaryTextColor` from `[...slug].vue`.
>
> The ejected file is a **point-in-time snapshot** — it does not update when
> `nuxt-og-image` is upgraded. After a notable upgrade, re-eject to pick up
> upstream template improvements and re-apply our small tweaks (props are passed
> at the call site, so only ESLint formatting differs from stock):
>
> ```bash
> npx nuxt-og-image eject Docs   # overwrites app/components/OgImage/Docs.takumi.vue
> pnpm lint --fix app/components/OgImage/Docs.takumi.vue
> ```
>
> See the official
> [Community Templates guide](https://nuxtseo.com/docs/og-image/guides/community-templates).

### Regenerating the landing page OG image

1. Start the dev server: `mise run dev`
2. Open browser DevTools and set the viewport to 1200x630
3. Navigate to `http://localhost:3000`
4. Take a screenshot of the viewport (DevTools > Run command > "Capture
   screenshot")
5. Save as `public/images/og.png`

> **Keep a safe margin.** X (Twitter) crops the `summary_large_image` card
> slightly inward, so content flush against the edges (the "Alberta … Resources"
> title) gets clipped. Keep important content within the central ~80% — i.e.
> roughly a 10% margin on every side. A raw viewport screenshot puts the title
> hard against the left edge, so scale the screenshot down to ~80% and center it
> on a 1200×630 white canvas before saving, e.g. with `sips`:
>
> ```bash
> sips -z 1011 1920 og-raw.png --out og-scaled.png
> sips -p 1264 2400 --padColor FFFFFF og-scaled.png --out public/images/og.png
> ```

### Validating OG image rendering

- [X Card Validator](https://www.schedulethreads.com/tools/twitter-x-card-validator)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Nuxt DevTools > Open Graph
- Open any page in the browser and inspect the `<meta property="og:image">` tag
  to see the actual generated URL

## Sitemap and robots.txt

Validate with the
[Nuxt SEO Sitemap Validation Tool](https://nuxtseo.com/tools/xml-sitemap-validator).

Sitemap:

- <http://localhost:3000/sitemap.xml> (dev)
- <https://www.alberta-hiking-resources.org/sitemap.xml> (prod)

robots:

- <http://localhost:3000/robots.txt> (disallows indexing in development)
- <http://localhost:3000/robots.txt?mockProductionEnv> (allows indexing, for
  testing the production version of `robots.txt` in development)
- <https://www.alberta-hiking-resources.org/robots.txt> (prod)
