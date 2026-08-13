import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://www.alberta-hiking-resources.org'
const siteTitle = 'Alberta Hiking Resources'
const siteDescription = 'Find your way in the jungle of FB and Meetup groups. Hiking Partners. Information. Ideas.'

// URLs this site used to serve, mapped to the page that replaced them. Every one
// of these was live and indexed; without a redirect they are plain 404s, which is
// what Google Search Console reports under "Not found (404)", and any ranking or
// inbound link they had is discarded rather than passed on.
//
// The first block is the pre-Nuxt-4 structure (everything under
// /hiking-groups and /practical-information, retired by `db08e2c5`); the rest are
// individual pages renamed or merged since. Entries are permanent — a URL only
// needs to have been public once for someone to still be linking to it — so they
// accumulate rather than get cleaned up. See docs/architecture.md.
const legacyRedirects: Record<string, string> = {
  // Pre-Nuxt-4 structure
  '/getting-started/introduction': '/getting-started',
  '/hiking-groups': '/meetup-groups',
  '/hiking-groups/by-category': '/meetup-groups',
  '/hiking-groups/by-category/meetups': '/meetup-groups',
  '/hiking-groups/by-category/inspirational': '/meetup-groups/facebook',
  // Earlier name for the page above, live only briefly but deployed and indexed
  '/hiking-groups/by-category/pictures-and-ideas': '/meetup-groups/facebook',
  '/hiking-groups/by-category/practical-information': '/meetup-groups/facebook',
  '/hiking-groups/by-category/trail-information': '/meetup-groups/facebook',
  '/hiking-groups/group-info': '/meetup-groups',
  '/hiking-groups/group-info/alberta-hikers-and-climbers': '/meetup-groups/alberta-mountain-aholics',
  '/hiking-groups/group-info/alberta-hikers-together': '/meetup-groups/alberta-hikers-together',
  '/hiking-groups/group-info/find-hiking-groups-partners-alberta': '/meetup-groups/find-hiking-groups-partners-alberta',
  // The old /practical-information hub spanned what is now three sections; it
  // sends to the one that inherited most of it (guidebooks, trip reports, apps).
  '/practical-information': '/hiking-scrambling-beta',
  '/practical-information/guidebooks': '/hiking-scrambling-beta/guidebooks',
  '/practical-information/trip-reports': '/hiking-scrambling-beta/trip-reports',
  '/practical-information/apps': '/hiking-scrambling-beta/apps',
  '/practical-information/weather': '/weather-trail-conditions',
  '/practical-information/fires-smoke': '/weather-trail-conditions/fires-smoke',
  '/practical-information/trail-conditions': '/weather-trail-conditions/trail-conditions',
  '/practical-information/bookings': '/accommodation',
  '/practical-information/gear': '/outdoor-gear',

  // Renamed or merged since
  '/meetup-groups/meetup.com': '/meetup-groups/meetup-com',
  '/meetup-groups/alberta-hikers-and-climbers': '/meetup-groups/alberta-mountain-aholics',
  '/hiking-scrambling-beta/camping-huts': '/accommodation',
  '/weather-trail-conditions/popular-locations/other-bc-national-parks': '/weather-trail-conditions/popular-locations/rogers-pass-revelstoke-golden',
  '/accommodation/other-bc-national-parks': '/accommodation/rogers-pass-revelstoke-golden'
}

// Pages that survived the restructure, but which the old site *also* served with
// a trailing slash — the form Google indexed and still requests. Here only the
// trailing-slash form redirects, back to the live page at the bare path.
//
// These cannot be route rules. radix3 strips a trailing slash before matching
// (Nitro leaves `strictTrailingSlash` unset), so `/faq/` and `/faq` are the same
// rule, and adding one replaces the live page with a stub pointing at itself.
// The stub file is written directly instead — see the `nitro:init` hook below.
//
// The list is exactly the surviving URLs found in the build output this repo
// used to commit. Nothing today emits a trailing slash, so it does not grow with
// new pages.
const trailingSlashOnlyRedirects = [
  '/faq',
  '/getting-started',
  '/getting-started/contributing',
  '/hike-organizers',
  '/hike-organizers/sami'
]

// h3's own redirect markup, reproduced so a hand-written stub is byte-identical
// to the ones Nitro generates from the route rules.
const redirectStub = (to: string) =>
  `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${to}"></head></html>`

// One rule per retired path — with matching being trailing-slash-insensitive,
// `/a/b` covers `/a/b/` too. What is *not* insensitive is the file the
// prerenderer writes, which follows the URL it was asked for, so both forms are
// requested in `prerender.routes` below to get both `a/b.html` and
// `a/b/index.html`. On GitHub Pages neither of those serves the other's URL.
const legacyRedirectRouteRules = Object.fromEntries(
  Object.entries(legacyRedirects).map(([from, to]) => [from, { redirect: { to, statusCode: 301 as const } }])
)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxtjs/sitemap',
    '@nuxt/content', // must be after @nuxtjs/sitemap
    '@nuxtjs/robots',
    'nuxt-og-image',
    'nuxt-llms',
    '@nuxtjs/mcp-toolkit',
    '@nuxt/fonts',
    // Dev-only: exposes the running app's routes, components, and resolved
    // config to an AI assistant over MCP at /__mcp/sse. Excluded from the
    // prerendered production bundle. includeNuxtDocsMcp is disabled because it
    // injects nuxt.com/mcp as an `sse` server every dev run, but that endpoint
    // speaks Streamable HTTP — we register it as `http` in .mcp.json instead.
    ...(process.env.NODE_ENV !== 'production'
      ? [['nuxt-mcp-dev', { includeNuxtDocsMcp: false }] as [string, Record<string, unknown>]]
      : [])
  ],

  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

  css: ['~/assets/css/main.css'],

  site: {
    url: siteUrl,
    name: siteTitle
  },
  content: {
    // `experimental.sqliteConnector` is deliberately not set. @nuxt/content
    // defaults to better-sqlite3 and switches to the sqlite3 connector by itself
    // when it detects a WebContainer — the only environment here that needs a
    // different one, and the connector its own docs recommend there. Setting it
    // explicitly would pin a choice upstream already makes correctly, and would
    // stop tracking it if their recommendation changes.
    //
    // `native` (Node's built-in node:sqlite) is the interesting alternative: it
    // would remove the better-sqlite3 addon entirely, and a full build on the
    // pinned Node 26 works. It is not adopted here because it applies everywhere
    // rather than only where it is needed, and node:sqlite is still flagged
    // experimental in Node. See docs/setup-development-environment.md.
    build: {
      markdown: {
        toc: {
          searchDepth: 1
        }
      }
    }
  },

  runtimeConfig: {
    // Keys within public are also exposed client-side
    public: {
      siteUrl: siteUrl
    }
  },

  // There is no runtime server on GitHub Pages, so a redirect has to exist as a
  // file. Nitro prerenders each of these into an HTML stub whose only content is
  // a `<meta http-equiv="refresh">` to the target — which Google treats as a
  // redirect and follows. They have to be listed in `prerender.routes` below:
  // nothing links to them, so the crawler would never reach them on its own.
  // @nuxtjs/sitemap recognises those stubs and keeps them out of sitemap.xml.
  routeRules: legacyRedirectRouteRules,

  experimental: {
    asyncContext: true
  },

  // Matches the upstream docs template. This opts into the Nuxt/Nitro defaults
  // as of that date rather than the 2024-07-11 ones the project was scaffolded
  // with; raise it deliberately alongside a build+prerender check, never
  // automatically, since it changes framework behaviour rather than a version.
  compatibilityDate: '2026-06-30',

  nitro: {
    prerender: {
      routes: [
        '/',
        ...Object.keys(legacyRedirectRouteRules).flatMap(path => [path, `${path}/`])
      ],
      crawlLinks: true,
      autoSubfolderIndex: false
    }
  },

  vite: {
    build: {
      // Nuxt UI / Vue framework chunks exceed 500 kB and can't be easily split
      chunkSizeWarningLimit: 700
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vueuse/core'
      ]
    }
  },

  hooks: {
    // The five trailing-slash-only redirects, written straight into the bundle
    // once prerendering is finished. This runs after the pages themselves are
    // rendered, so a `faq/index.html` stub cannot influence how `/faq` renders,
    // and the files are never registered as prerendered routes, so @nuxtjs/sitemap
    // never sees them either. Putting them in `public/` instead would be simpler
    // but risks Nitro's static handler resolving `/faq` to `faq/index.html` and
    // shadowing the real page in dev and during prerender.
    'nitro:init': (nitro) => {
      nitro.hooks.hook('prerender:done', async () => {
        for (const to of trailingSlashOnlyRedirects) {
          const file = join(nitro.options.output.publicDir, to, 'index.html')
          await mkdir(dirname(file), { recursive: true })
          await writeFile(file, redirectStub(to))
        }
        nitro.logger.success(`Wrote ${trailingSlashOnlyRedirects.length} trailing-slash redirect stubs`)
      })
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    provider: 'iconify',

    // Without this, only the icons @nuxt/ui registers itself end up in the
    // client bundle; every other icon is fetched from api.iconify.design at
    // render time, which logs "[Icon] failed to load icon" for each one and
    // leaves the site dependent on a third-party host at runtime — a problem
    // for a statically prerendered build. Scanning bundles the icons we
    // actually use instead.
    //
    // `scan: true` keeps @nuxt/icon's default globs, which cover .vue and .md
    // — the latter matters most here, since most of our icons are declared in
    // content frontmatter rather than in components. Setting globInclude to
    // extend that list is tempting but replaces it, pinning a copy of the
    // module's internals that silently goes stale when upstream adds an
    // extension.
    clientBundle: {
      scan: true,

      // Those default globs skip .ts, so nothing in app.config.ts is scanned.
      // These are the icons it declares that nothing else pulls in:
      // i-lucide-history on the header's Changelog link, and i-lucide-circle-dot
      // on the footer's Contact Us link. It declares two others that are covered
      // incidentally and so are not repeated here — i-lucide-github also appears
      // in a scanned .vue file, and i-lucide-star is one of the icons @nuxt/ui
      // registers itself. Nothing guarantees either stays true, but the failure
      // is loud rather than silent: an icon that is neither scanned nor listed
      // warns on every render.
      icons: ['lucide:history', 'lucide:circle-dot']
    }
  },

  llms: {
    domain: siteUrl,
    title: siteTitle,
    description: siteDescription,
    full: {
      title: siteTitle,
      description: siteDescription
    },
    sections: [
      {
        title: 'Getting Started',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/getting-started%' }
        ]
      },
      {
        title: 'Meetup Groups',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/meetup-groups%' }
        ]
      },
      {
        title: 'Hiking & Scrambling Beta',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/hiking-scrambling-beta%' }
        ]
      },
      {
        title: 'Weather & Trail Conditions',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/weather-trail-conditions%' }
        ]
      },
      {
        title: 'Events',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/events%' }
        ]
      },
      {
        title: 'Outdoor Gear',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/outdoor-gear%' }
        ]
      },
      {
        title: 'Hike Organizers',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/hike-organizers%' }
        ]
      },
      {
        title: 'Frequently Asked Questions',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/faq%' }
        ]
      }
    ]
  },

  // `name` is consumed by @nuxtjs/mcp-toolkit (the runtime MCP server). Note
  // nuxt-mcp-dev shares this same `mcp` configKey; its own options are passed
  // inline in the `modules` array above to avoid the shared-key type collision.
  mcp: {
    name: siteTitle
  },

  // Site is deployed as a fully prerendered static bundle to GitHub Pages,
  // so there is no runtime Nitro server to handle dynamic OG image generation.
  // zeroRuntime strips the runtime endpoint and silences the URL-signing warning.
  ogImage: {
    zeroRuntime: true
  }
})
