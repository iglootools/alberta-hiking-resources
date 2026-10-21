<!--
  The region map for a section index page:

    ::region-map{section="weather"}

  Clicking a region, on the map or in the legend under it, opens that
  section's page for it. Two renderers are on trial (ADR-010): the
  prerendered SVG map, and a MapLibre map on a live basemap, which a reader
  can switch to. Every page load starts on the SVG map: the choice is
  deliberately not remembered, so the ~1 MB library is only ever downloaded
  by a reader who asks for it on that page.

  The highlighted region lives here so the legend and either map light up
  together, whichever one the pointer is over.
-->
<script setup lang="ts">
import map from '~/assets/region-map.json'

defineProps<{
  section: RegionMapSection
}>()

const renderer = ref<'svg' | 'maplibre'>('svg')
const highlighted = ref<string>()

/** The legend, grouped under the same headings as the region cards, in the same order. */
const legend = map.regions.reduce<{ title: string, regions: { id: string, title: string, swatch: string }[] }[]>((groups, region, index) => {
  const entry = { id: region.id, title: region.title, swatch: regionColor(index, false) }
  const last = groups.at(-1)
  if (last?.title === region.group) last.regions.push(entry)
  else groups.push({ title: region.group, regions: [entry] })
  return groups
}, [])
</script>

<template>
  <div class="my-6 space-y-3">
    <div class="flex justify-end">
      <UFieldGroup size="xs">
        <UButton
          icon="i-lucide-map"
          label="Simple map"
          :color="renderer === 'svg' ? 'primary' : 'neutral'"
          :variant="renderer === 'svg' ? 'subtle' : 'outline'"
          @click="renderer = 'svg'"
        />
        <UButton
          icon="i-lucide-earth"
          label="Interactive map"
          :color="renderer === 'maplibre' ? 'primary' : 'neutral'"
          :variant="renderer === 'maplibre' ? 'subtle' : 'outline'"
          @click="renderer = 'maplibre'"
        />
      </UFieldGroup>
    </div>
    <RegionMapSvg
      v-if="renderer === 'svg'"
      v-model:highlighted="highlighted"
      :section="section"
    />
    <ClientOnly v-else>
      <LazyRegionMapLibre
        v-model:highlighted="highlighted"
        :section="section"
      />
    </ClientOnly>
    <nav
      aria-label="Regions"
      class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3"
    >
      <section
        v-for="group in legend"
        :key="group.title"
      >
        <h3 class="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
          {{ group.title }}
        </h3>
        <ul>
          <li
            v-for="region in group.regions"
            :key="region.id"
          >
            <NuxtLink
              :to="regionPath(section, region.id)"
              class="flex items-center gap-2 py-0.5 text-default hover:underline focus-visible:underline"
              :class="{ underline: highlighted === region.id }"
              @mouseenter="highlighted = region.id"
              @mouseleave="highlighted = undefined"
              @focus="highlighted = region.id"
              @blur="highlighted = undefined"
            >
              <span
                class="size-3 shrink-0 rounded-sm"
                :style="{ background: region.swatch }"
              />
              {{ region.title }}
            </NuxtLink>
          </li>
        </ul>
      </section>
    </nav>
  </div>
</template>
