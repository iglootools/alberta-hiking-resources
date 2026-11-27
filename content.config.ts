import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'

export default defineContentConfig({
  collections: {
    landing: defineCollection({
      type: 'page',
      source: 'index.md',
      schema: z.object({
        sitemap: defineSitemapSchema()
      })
    }),
    docs: defineCollection({
      type: 'page',
      source: {
        include: '**',
        exclude: ['index.md']
      },
      schema: z.object({
        sitemap: defineSitemapSchema(),
        // Set by `mise run build-trip-index` on the pages it writes, which the
        // next run overwrites: [...slug].vue offers no "Edit this page" on them.
        generated: z.boolean().optional(),
        links: z.array(z.object({
          label: z.string(),
          icon: z.string(),
          to: z.string(),
          target: z.string().optional()
        })).optional()
      })
    })
  }
})
