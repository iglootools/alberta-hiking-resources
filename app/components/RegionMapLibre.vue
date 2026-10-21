<!--
  The region map on a live MapLibre basemap: streets, park names and
  hillshading under the same generated region shapes as the SVG map.

  Everything heavy is fetched only when this mounts — the library and its CSS
  by dynamic import, the regions as public/region-map/regions.geojson — and
  RegionMap only mounts it, client-side, once a reader asks for it. So the
  ~800 KB library costs nothing to a reader who never switches.

  MapLibre 6 finds its web worker from its own module URL at runtime, which
  Vite can neither see nor copy, so without help the worker 404s and the map
  never finishes loading. Importing the worker with `?worker&url` makes Vite
  bundle it, and setWorkerUrl points MapLibre at the result.

  The tiles come from OpenFreeMap (no key, OpenStreetMap data) and the
  hillshading from the public AWS terrain tiles. Both are third-party hosts
  read at runtime, which is the trade-off ADR-010 is trialling.
-->
<script setup lang="ts">
import type { FeatureCollection } from 'geojson'
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import { joinURL } from 'ufo'

const props = defineProps<{
  section: RegionMapSection
}>()

/** The highlighted region's id, shared with the legend and the SVG map through RegionMap. */
const highlighted = defineModel<string>('highlighted')

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark'
}
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
/**
 * How long to wait for the first render before saying it failed. MapLibre
 * reports a worker or style that never loads as silence, not as an error, and
 * a spinner that never ends tells a reader nothing.
 */
const LOAD_TIMEOUT_MS = 20_000
/** The same framing as the SVG map's "The Rockies" view. */
const ROCKIES: [[number, number], [number, number]] = [[-120.2, 48.6], [-113.2, 53.6]]

const container = ref<HTMLElement>()
const status = ref<'loading' | 'ready' | 'failed'>('loading')
const terrain = ref(false)
const colorMode = useColorMode()
const config = useRuntimeConfig()

let map: MapLibreMap | undefined
let regions: FeatureCollection | undefined
let hoveredId: number | undefined
/** Region id to feature id, which is the region's index. */
let featureIds = new Map<string, number>()

const isDark = () => colorMode.value === 'dark'

/**
 * A style swap drops every layer the page added, so they are added here and
 * this runs on every `style.load`, not once.
 */
function addRegionLayers(target: MapLibreMap) {
  if (!regions) return
  const firstLabel = target.getStyle().layers.find(layer => layer.type === 'symbol')?.id
  target.addSource('dem', { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Terrain: Mapzen / AWS Terrain Tiles' })
  target.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.5 } }, firstLabel)
  target.addSource('regions', { type: 'geojson', data: regions })
  target.addLayer({
    id: 'region-fill',
    type: 'fill',
    source: 'regions',
    filter: ['==', ['get', 'kind'], 'fill'],
    paint: {
      'fill-antialias': false,
      'fill-color': ['to-color', ['at', ['get', 'region'], ['literal', Array.from({ length: Math.max(...featureIds.values()) + 1 }, (_, index) => regionColor(index, isDark()))]]],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.6, 0.3]
    }
  }, firstLabel)
  target.addLayer({
    id: 'region-outline',
    type: 'line',
    source: 'regions',
    filter: ['==', ['get', 'kind'], 'outline'],
    paint: {
      'line-color': isDark() ? '#e5e7eb' : '#1f2937',
      'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.3],
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0.7]
    }
  })
  target.addLayer({
    id: 'region-label',
    type: 'symbol',
    source: 'regions',
    filter: ['==', ['get', 'kind'], 'label'],
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 9, 15],
      'text-max-width': 8
    },
    paint: {
      'text-color': isDark() ? '#f3f4f6' : '#111827',
      'text-halo-color': isDark() ? '#111827' : '#ffffff',
      'text-halo-width': 1.6
    }
  })
  if (terrain.value) target.setTerrain({ source: 'dem', exaggeration: 1.3 })
  // A style swap also drops feature state, so re-apply the highlight.
  hoveredId = undefined
  setHover(target, highlighted.value === undefined ? undefined : featureIds.get(highlighted.value))
}

function setHover(target: MapLibreMap, id: number | undefined) {
  if (hoveredId !== undefined) target.setFeatureState({ source: 'regions', id: hoveredId }, { hover: false })
  if (id !== undefined) target.setFeatureState({ source: 'regions', id }, { hover: true })
  hoveredId = id
}

function bindInteraction(target: MapLibreMap) {
  // `fill` features carry an id per region, shared with the outline and label, so one feature-state lights all three.
  target.on('mousemove', 'region-fill', (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    if (!feature) return
    highlighted.value = feature.properties.id as string
    target.getCanvas().style.cursor = 'pointer'
  })
  target.on('mouseleave', 'region-fill', () => {
    highlighted.value = undefined
    target.getCanvas().style.cursor = ''
  })
  target.on('click', 'region-fill', (event: MapLayerMouseEvent) => {
    const id = event.features?.[0]?.properties.id
    if (typeof id === 'string') navigateTo(regionPath(props.section, id))
  })
}

onMounted(async () => {
  try {
    const [maplibre, worker, data] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
      $fetch<FeatureCollection>(joinURL(config.app.baseURL, 'region-map/regions.geojson')),
      import('maplibre-gl/dist/maplibre-gl.css')
    ])
    maplibre.setWorkerUrl(worker.default)
    regions = data
    featureIds = new Map(data.features.map(feature => [feature.properties!.id as string, feature.id as number]))
    if (!container.value) return
    setTimeout(() => {
      if (status.value === 'loading') status.value = 'failed'
    }, LOAD_TIMEOUT_MS)
    const created = new maplibre.Map({
      container: container.value,
      style: isDark() ? STYLES.dark : STYLES.light,
      bounds: ROCKIES,
      maxPitch: 70,
      cooperativeGestures: true
    })
    created.addControl(new maplibre.NavigationControl({ visualizePitch: true }), 'top-right')
    created.addControl(new maplibre.ScaleControl(), 'bottom-left')
    created.on('style.load', () => addRegionLayers(created))
    created.once('load', () => {
      status.value = 'ready'
    })
    created.on('error', ({ error }) => console.error('[RegionMapLibre]', error))
    bindInteraction(created)
    map = created
  } catch (error) {
    // Most likely a blocked or offline tile or CDN host; the SVG map remains one click away.
    console.error('[RegionMapLibre]', error)
    status.value = 'failed'
  }
})

watch(highlighted, (id) => {
  if (map?.getSource('regions')) setHover(map, id === undefined ? undefined : featureIds.get(id))
})

watch(() => colorMode.value, () => map?.setStyle(isDark() ? STYLES.dark : STYLES.light))

watch(terrain, (on) => {
  if (!map) return
  map.setTerrain(on ? { source: 'dem', exaggeration: 1.3 } : null)
  map.easeTo({ pitch: on ? 60 : 0, duration: 800 })
})

onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div class="space-y-2">
    <div class="relative h-[28rem] overflow-hidden rounded-md border border-default sm:h-[34rem]">
      <!-- Sized with h-full, not absolute positioning: MapLibre's CSS sets position: relative on this element. -->
      <div
        ref="container"
        class="h-full w-full"
      />
      <div
        v-if="status !== 'ready'"
        class="absolute inset-0 grid place-items-center bg-elevated text-sm text-muted"
      >
        {{ status === 'loading' ? 'Loading the interactive map…' : 'The interactive map could not load. The simple map still works, and the browser console says why.' }}
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p class="text-muted">
        Ctrl- or ⌘-scroll to zoom, right-drag to tilt.
      </p>
      <UCheckbox
        v-model="terrain"
        label="3D terrain"
        :disabled="status !== 'ready'"
      />
    </div>
  </div>
</template>
