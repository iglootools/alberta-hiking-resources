<script setup lang="ts">
import type { TocLink } from '@nuxt/content'

const props = defineProps<{
  links: TocLink[]
}>()

/*
 * The generated trip report pages put their objectives under one heading per
 * letter, and the largest holds over 500 entries. The table of contents already
 * lists those letters, but it is a sidebar on desktop and collapsed on mobile,
 * so neither keeps them in reach while scrolling. This repeats them as a sticky
 * strip above the body.
 *
 * It is recognised from the headings rather than flagged per page: a page whose
 * headings are all single letters (or "0–9", the generator's bucket for names
 * that start with a digit) is an A–Z index. The minimum keeps a
 * page with a couple of one-letter headings from qualifying by accident.
 */
const MINIMUM_LETTERS = 5

const letters = computed(() => {
  const isLetter = (link: TocLink) => /^(?:\p{Lu}|0–9)$/u.test(link.text)
  return props.links.every(isLetter) && props.links.length >= MINIMUM_LETTERS
    ? props.links
    : []
})
</script>

<template>
  <nav
    v-if="letters.length"
    aria-label="Jump to letter"
    class="sticky top-(--ui-header-height) z-10 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-default/90 backdrop-blur border-b border-default"
  >
    <ul class="flex gap-1 overflow-x-auto sm:flex-wrap">
      <li
        v-for="link in letters"
        :key="link.id"
      >
        <UButton
          :to="`#${link.id}`"
          :label="link.text"
          color="neutral"
          variant="ghost"
          size="xs"
          class="min-w-7 justify-center font-mono"
        />
      </li>
    </ul>
  </nav>
</template>
