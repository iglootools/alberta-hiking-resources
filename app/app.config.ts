export default defineAppConfig({
  repository: 'iglootools/alberta-hiking-resources',
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
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
