# Architecture

This site is a [Nuxt](https://nuxt.com/) application built on
[Nuxt UI](https://ui.nuxt.com/) and the
[Nuxt UI Docs template](https://docs-template.nuxt.dev/), with content authored
in Markdown via [Nuxt Content](https://content.nuxt.com/) and
[Nuxt MDC](https://github.com/nuxt-content/mdc).

For the log of significant decisions, see
[architecture-decision-record.md](architecture-decision-record.md).

## Built with

- [Nuxt UI](https://ui.nuxt.com/)
- [Nuxt UI Docs Template](https://docs-template.nuxt.dev/)
- [Nuxt MDC](https://github.com/nuxt-content/mdc)
- Icons via [Iconify](https://iconify.design/) (browse at
  [icones.js.org](https://icones.js.org/))

## Initial project setup

The project was bootstrapped with:

```bash
npm create nuxt@latest -- -t github:nuxt-ui-templates/docs
```

With the following parameters:

- Package Manager: `pnpm`
- Additional Nuxt modules:
  - Nuxt Devtools (enabled in dev only)
  - [@nuxt/hints](https://nuxt.com/modules/hints)
  - [@nuxtjs/sitemap](https://nuxtseo.com/docs/sitemap/guides/content)

## Divergence from the template

Recorded separately, in
[divergence-from-the-template.md](divergence-from-the-template.md) — the licence, the SEO
modules, the toolchain and dependency choices, and the `nuxt.config.ts` changes.
