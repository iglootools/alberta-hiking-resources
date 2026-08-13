const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://www.alberta-hiking-resources.org'
const siteTitle = 'Alberta Hiking Resources'
const siteDescription = 'Find your way in the jungle of FB and Meetup groups. Hiking Partners. Information. Ideas.'

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
        '/'
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
