<script setup lang="ts">
const { data: page } = await useAsyncData('index', () => queryCollection('landing').path('/').first())
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const title = page.value.seo?.title || page.value.title
const description = page.value.seo?.description || page.value.description

// Use a custom static OG image for the landing page instead of the auto-generated template,
// so we can have a more polished, branded social preview.
const config = useRuntimeConfig()
const ogImage = `${config.public.siteUrl}/images/og.png`

useSeoMeta({
  titleTemplate: '',
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: ogImage,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage
})
</script>

<template>
  <ContentRenderer
    v-if="page"
    :value="page"
    :prose="false"
    :components="{ a: 'prose-a' }"
  />
</template>
