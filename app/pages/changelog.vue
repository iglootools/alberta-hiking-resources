<script setup lang="ts">
const appConfig = useAppConfig()

useSeoMeta({
  title: 'Changelog',
  ogTitle: 'Changelog',
  description: 'Latest releases and updates for Alberta Hiking Resources.',
  ogDescription: 'Latest releases and updates for Alberta Hiking Resources.'
})

const { data: versions, error } = await useFetch(computed(() => `https://ungh.cc/repos/${appConfig.repository}/releases`), {
  transform: (data: {
    releases?: {
      name?: string
      tag: string
      publishedAt: string
      markdown: string
    }[]
  }) => {
    if (!Array.isArray(data.releases)) {
      throw new TypeError('ungh.cc answered without a list of releases')
    }
    return data.releases.map(release => ({
      tag: release.tag,
      title: release.name || release.tag,
      date: release.publishedAt,
      markdown: release.markdown
    }))
  }
})

// The page is prerendered, so an outage at ungh.cc would otherwise be
// published as "No releases yet." until the next build. Failing the render
// fails the prerender, and with it the publish, which can then be re-run.
if (error.value) {
  throw createError({
    status: 502,
    statusText: 'Bad Gateway',
    message: `Could not load the releases from ungh.cc: ${error.value.message}`,
    fatal: true
  })
}
</script>

<template>
  <UChangelogVersions
    v-if="versions?.length"
    as="main"
    :indicator-motion="false"
    :ui="{
      root: 'py-16 sm:py-24 lg:py-32',
      indicator: 'inset-y-0'
    }"
  >
    <UChangelogVersion
      v-for="version in versions"
      :key="version.tag"
      v-bind="version"
      :ui="{
        root: 'flex items-start',
        container: 'max-w-xl',
        header: 'border-b border-default pb-4',
        title: 'text-3xl',
        date: 'text-xs/9 text-highlighted font-mono',
        indicator: 'sticky top-0 pt-16 -mt-16 sm:pt-24 sm:-mt-24 lg:pt-32 lg:-mt-32'
      }"
    >
      <template #body>
        <MDC
          v-if="version.markdown"
          :value="version.markdown"
        />
      </template>
    </UChangelogVersion>
  </UChangelogVersions>

  <div
    v-else
    class="py-24 text-center text-muted"
  >
    <p>No releases yet.</p>
  </div>
</template>
