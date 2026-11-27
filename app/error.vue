<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})

// Only a 404 is a missing page; anything else is a failure on our side, and
// calling it "not found" would mislead readers and crawlers alike.
const notFound = computed(() => props.error.statusCode === 404)
useSeoMeta({
  title: () => notFound.value ? 'Page not found' : 'Something went wrong',
  description: () => notFound.value
    ? 'We are sorry but this page could not be found.'
    : 'We are sorry but this page could not be displayed.'
})

const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'))
const { data: files } = useLazyAsyncData('search', () => queryCollectionSearchSections('docs'), {
  server: false
})

provide('navigation', navigation)
</script>

<template>
  <UApp>
    <AppHeader />

    <UError :error="error" />

    <AppFooter />

    <ClientOnly>
      <LazyUContentSearch
        :files="files"
        :navigation="navigation"
      />
    </ClientOnly>
  </UApp>
</template>
