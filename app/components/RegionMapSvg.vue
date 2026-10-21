<!--
  The region map as inline SVG: prerendered with the page, no library, no
  network. Shapes and basemap come from app/assets/region-map.json, which
  `mise run build-trip-index` generates; nothing here is drawn by hand.

  Each region is a real link, so it works before hydration, from the keyboard,
  and for crawlers. Clicks are routed through navigateTo so they stay in-app.
-->
<script setup lang="ts">
import map from '~/assets/region-map.json'

const props = defineProps<{
  section: RegionMapSection
}>()

/** The highlighted region's id, shared with the legend and the MapLibre map through RegionMap. */
const highlighted = defineModel<string>('highlighted')
/** Opens on every region; "The Rockies" zooms in on the parks, where the regions are smallest. */
const zoomed = ref(false)

const viewBox = computed(() => zoomed.value
  ? `${Math.round(map.width * 0.58)} 0 ${Math.round(map.width * 0.42)} ${Math.round(map.height * 0.97)}`
  : `0 0 ${map.width} ${map.height}`)

const regions = map.regions.map((region, index) => ({
  ...region,
  index,
  name: regionLabel(region.id, region.title),
  style: { '--hue': regionHue(index), '--shade': regionShade(index) }
}))

function open(event: MouseEvent, regionId: string) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  navigateTo(regionPath(props.section, regionId))
}
</script>

<template>
  <div class="space-y-2">
    <!-- The Rockies view is taller than wide; capping the height letterboxes it on the sea colour rather than filling a screen. -->
    <div class="region-map-frame overflow-hidden rounded-md border border-default">
      <svg
        :viewBox="viewBox"
        class="region-map mx-auto block h-auto max-h-[34rem] w-full"
        :class="{ zoomed }"
        role="group"
        aria-label="Map of the regions"
      >
        <rect
          class="sea"
          :width="map.width"
          :height="map.height"
        />
        <path
          class="land"
          :d="map.land"
        />
        <path
          class="lake"
          :d="map.lakes"
        />
        <g class="regions">
          <template
            v-for="region in regions"
            :key="region.id"
          >
            <a
              v-if="region.path"
              :href="regionPath(section, region.id)"
              :aria-label="region.title"
              :class="{ on: highlighted === region.id }"
              @click="open($event, region.id)"
              @mouseenter="highlighted = region.id"
              @mouseleave="highlighted = undefined"
              @focus="highlighted = region.id"
              @blur="highlighted = undefined"
            >
              <title>{{ region.title }}</title>
              <path
                :d="region.path"
                :style="region.style"
              />
            </a>
          </template>
        </g>
        <path
          class="lake over"
          :d="map.lakes"
        />
        <path
          class="borders"
          :d="map.borders"
        />
        <g class="towns">
          <template
            v-for="town in map.towns"
            :key="town.name"
          >
            <circle
              :cx="town.x"
              :cy="town.y"
              r="1.6"
            />
            <text
              :x="town.x + 3"
              :y="town.y + 2.5"
            >{{ town.name }}</text>
          </template>
        </g>
        <g class="labels">
          <template
            v-for="region in regions"
            :key="region.id"
          >
            <text
              v-if="region.label"
              :x="region.label.x"
              :y="region.label.y"
            >{{ region.name }}</text>
          </template>
        </g>
      </svg>
    </div>
    <div class="flex justify-end">
      <UFieldGroup size="xs">
        <UButton
          label="The Rockies"
          :color="zoomed ? 'primary' : 'neutral'"
          :variant="zoomed ? 'subtle' : 'outline'"
          @click="zoomed = true"
        />
        <UButton
          label="Everything"
          :color="zoomed ? 'neutral' : 'primary'"
          :variant="zoomed ? 'outline' : 'subtle'"
          @click="zoomed = false"
        />
      </UFieldGroup>
    </div>
  </div>
</template>

<style scoped>
/*
  Lightness is resolved here rather than in the markup so the prerendered SVG is
  the same in both colour modes. --shade darkens alternate regions so
  neighbours stay apart.
*/
.region-map {
  --region-lightness: 52%;
  --region-opacity: 0.55;
}
:global(.dark) .region-map {
  --region-lightness: 48%;
  --region-opacity: 0.6;
}
.region-map-frame { background: color-mix(in oklab, var(--ui-secondary) 14%, var(--ui-bg)); }
.sea { fill: color-mix(in oklab, var(--ui-secondary) 14%, var(--ui-bg)); }
.land { fill: var(--ui-bg-elevated); }
.lake { fill: color-mix(in oklab, var(--ui-secondary) 30%, var(--ui-bg)); }
.lake.over { opacity: 0.5; pointer-events: none; }
.regions path {
  fill: hsl(var(--hue) 55% calc(var(--region-lightness) - var(--shade) * 10%));
  fill-opacity: var(--region-opacity);
  shape-rendering: crispEdges;
  transition: fill-opacity 0.15s;
}
.regions:has(a.on) path { fill-opacity: 0.25; }
.regions a.on path { fill-opacity: 0.95; }
.regions a { cursor: pointer; outline: none; }
.regions a:focus-visible path { stroke: var(--ui-text-highlighted); stroke-width: 1.5; }
.borders { fill: none; stroke: var(--ui-border-accented); stroke-width: 0.9; stroke-dasharray: 4 2.5; pointer-events: none; }
.towns { pointer-events: none; }
.towns circle { fill: var(--ui-text-muted); }
.towns text { font-size: 7px; fill: var(--ui-text-muted); }
.labels text {
  font-size: 8.5px;
  font-weight: 600;
  text-anchor: middle;
  fill: var(--ui-text-highlighted);
  paint-order: stroke;
  stroke: var(--ui-bg-elevated);
  stroke-width: 2.5px;
  pointer-events: none;
}
.zoomed .labels text { font-size: 5.5px; stroke-width: 1.8px; }
.zoomed .towns text { font-size: 4.5px; }
.zoomed .towns circle { r: 1px; }
@media (prefers-reduced-motion: reduce) {
  .regions path { transition: none; }
}
</style>
