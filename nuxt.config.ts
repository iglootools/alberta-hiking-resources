import { execFileSync } from 'node:child_process'

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://www.alberta-hiking-resources.org'
const siteTitle = 'Alberta Hiking Resources'
const siteDescription = 'Find your way in the jungle of FB and Meetup groups. Hiking Partners. Information. Ideas.'

// The release the footer names, linking to /changelog. package.json carries no
// version (semantic-release only tags), so the latest tag is the source of
// truth. publish.yml checks out with full history and tags, and builds after
// release.yml has tagged the commit, so the deployed site names its own
// release. CI's shallow checkout has no tags, so `undefined` there is expected
// rather than an error, and the footer falls back to a plain "Changelog" label.
const siteVersion = (() => {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined
  } catch {
    return undefined
  }
})()

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
    'nuxt-agent-discovery',
    '@nuxtjs/mcp-toolkit',
    // Dev-only: exposes the running app's routes, components, and resolved
    // config to an AI assistant over MCP at /__mcp/sse. Excluded from the
    // prerendered production bundle. includeNuxtDocsMcp is disabled because it
    // injects nuxt.com/mcp as an `sse` server every dev run, but that endpoint
    // speaks Streamable HTTP — we register it as `http` in .mcp.json instead.
    ...(process.env.NODE_ENV !== 'production'
      ? [['nuxt-mcp-dev', { includeNuxtDocsMcp: false }] as [string, Record<string, unknown>]]
      : [])
  ],

  // Since Nuxt 4.7, nuxt no longer depends on @nuxt/devtools: it ships
  // @nuxt/devtools-onboard, which loads whichever DevTools the app installs.
  // So @nuxt/devtools is in devDependencies, on v4: no floating Nuxt button any
  // more, but a Nuxt entry in the Vite DevTools dock, which Shift+Option+D shows
  // and hides. The dock stays Unauthorized until the browser enters the code
  // `mise run dev` prints (docs/setup-development-environment.md).
  devtools: {
    enabled: true,

    // Turns on the DevTools Timeline tab, which records composable calls and
    // route changes. Dev-only and off by default; kept on because it helps
    // when debugging, and costs nothing in the built site.
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

  ui: {
    eslint: {
      // Classes styled in a component's own <style> block, which the linter
      // cannot see: StarsBg's (as in the template) and RegionMapSvg's map layers.
      ignore: [
        '^stars$', '^star-layer$', '^star$',
        '^region-map(-frame)?$', '^(sea|land|lake|over|regions|borders|towns|labels)$'
      ],
      rules: {
        'no-unknown-classes': 'error',
        'no-conflicting-classes': 'error',
        'no-palette-colors': 'error'
      }
    }
  },

  runtimeConfig: {
    // Keys within public are also exposed client-side
    public: {
      siteUrl: siteUrl,
      siteVersion: siteVersion
    }
  },

  experimental: {
    asyncContext: true,

    // Builds the server's route matcher once instead of once per request.
    // Safe because no code adds routes at runtime: with it on,
    // router.addRoute/removeRoute/clearRoutes throw, and a route has to come
    // from the `pages:extend` hook instead. Here it only shortens the
    // prerender, since the deployed site has no server.
    staticRoutes: true,

    // staticRoutes would turn this on, but the root catch-all page
    // ([...slug].vue) matches every path, so there is never a path to 404
    // early on; Nuxt disables it anyway and warns (NUXT_B4019). Off explicitly
    // to record that and silence the warning.
    early404: false
  },

  // Matches the upstream docs template. This opts into the Nuxt/Nitro defaults
  // as of that date rather than the 2024-07-11 ones the project was scaffolded
  // with; raise it deliberately alongside a build+prerender check, never
  // automatically, since it changes framework behaviour rather than a version.
  compatibilityDate: '2026-06-30',

  nitro: {
    prerender: {
      // Writes /foo.html rather than /foo/index.html. GitHub Pages serves the
      // former at /foo, the URL the sitemap, canonical links and every internal
      // link use; the latter makes /foo a 301 to /foo/. The template dropped
      // this (0462726) because it does not deploy to GitHub Pages. Nitro-only,
      // so it stays here rather than under the top-level `prerender`.
      autoSubfolderIndex: false
    }
  },

  vite: {
    build: {
      // Nuxt UI / Vue framework chunks exceed 500 kB and can't be easily split
      chunkSizeWarningLimit: 700
    },
    optimizeDeps: {
      // Only packages this app declares belong here. Vite resolves these from
      // the project root, so with no `shamefullyHoist` an entry for anything
      // undeclared silently pre-bundles nothing and warns (NUXT_B7002).
      //
      // `@vue/devtools-core` and `@vue/devtools-kit` were listed here (4d9f7ef8)
      // while the flat root still made them resolvable, and became inert when it
      // was dropped in 08d20924. They are not ours to pre-bundle either — both
      // are internals of @nuxt/devtools, which nuxt itself depends on, so
      // declaring them would pin a version against nothing and risk a second
      // copy. Removed rather than declared; if Vite starts discovering them at
      // runtime again, that is Nuxt's to pre-bundle, not ours.
      include: [
        '@vueuse/core'
      ]
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
    // @nuxt/icon defaults to `server` unless it detects `nuxt generate`, and
    // `nuxt build --preset github_pages` is not detected as one, so the client
    // would fetch unbundled icons from /api/_nuxt_icon, which a static GitHub
    // Pages host does not serve. The template dropped this line (30e0c06)
    // because it does not deploy statically.
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
      // i-lucide-history on the Changelog links in the header and the table of
      // contents, and i-lucide-circle-dot on the table of contents' Contact Us
      // link. It declares two others that are covered
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
  },

  prerender: {
    routes: [
      '/'
    ],
    crawlLinks: true
  }
})
