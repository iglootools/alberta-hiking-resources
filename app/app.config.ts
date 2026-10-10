export default defineAppConfig({
  repository: 'iglootools/alberta-hiking-resources',
  ui: {
    colors: {
      primary: 'forest',
      secondary: 'glacier',
      neutral: 'slate'
    },
    // A feature with `to` only gets a focus outline upstream, so the landing
    // cards gave no sign they were links until clicked. Scoped to the `to`
    // variant so unlinked features, like the hero's Motivation, are unchanged.
    pageFeature: {
      variants: {
        to: {
          true: {
            root: 'group',
            title: 'group-hover:text-primary transition-colors'
          }
        }
      }
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'Alberta Hiking Resources'
  },
  header: {
    title: '',
    to: '/',
    logo: {
      alt: '',
      light: '',
      dark: ''
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-lucide-history',
      'to': '/changelog',
      'aria-label': 'Changelog'
    }, {
      'icon': 'i-lucide-github',
      'to': 'https://github.com/iglootools/alberta-hiking-resources',
      'target': '_blank',
      'aria-label': 'GitHub'
    }]
  },
  footer: {
    credits: `Built with Nuxt UI • © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-lucide-github',
      'to': 'https://github.com/iglootools/alberta-hiking-resources/',
      'target': '_blank',
      'aria-label': 'Alberta Hikers Together on Github'
    }]
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/iglootools/alberta-hiking-resources/edit/main/content',
      links: [{
        icon: 'i-lucide-star',
        label: 'Star on GitHub',
        to: 'https://github.com/iglootools/alberta-hiking-resources',
        target: '_blank'
      }, {
        icon: 'i-lucide-circle-dot',
        label: 'Contact Us',
        to: 'https://www.instagram.com/samidalouche/',
        target: '_blank'
      }]
    }
  }
})
