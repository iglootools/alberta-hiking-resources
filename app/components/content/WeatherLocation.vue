<script setup lang="ts">
const props = defineProps<{
  name: string
  park?: string
  meteoblueWeather?: string
  meteoblueAirQuality?: string
  meteoblueWebcams?: string
  windyWind?: string
  windyRain?: string
  windySmoke?: string
  windyWebcams?: string
  accuweather?: string
  theweathernetwork?: string
  environmentCanada?: string
  // US counterpart to environmentCanada, for locations south of the border.
  nws?: string
  iqair?: string
  googleMaps?: string
  extraWebcams?: Array<{ label: string, url: string }>
}>()

interface Link {
  label: string
  url?: string
}

interface Group {
  label: string
  icon: string
  links: Link[]
}

/*
 * A card can carry fourteen links or more, and as one undivided run of
 * identical buttons a reader had to read every label to find the one they
 * wanted. Grouping by what the link answers — the forecast, the smoke, what it
 * looks like right now — lets the provider be the button label and the
 * question be the row label. Every field stays optional: a group with no links
 * is dropped rather than shown empty.
 */
const groups = computed<Group[]>(() => [
  {
    label: 'Forecast',
    icon: 'i-lucide-cloud-sun',
    links: [
      { label: 'Meteoblue', url: props.meteoblueWeather },
      { label: 'Environment Canada', url: props.environmentCanada },
      { label: 'NWS', url: props.nws },
      { label: 'The Weather Network', url: props.theweathernetwork },
      { label: 'AccuWeather', url: props.accuweather },
      { label: 'Windy wind', url: props.windyWind },
      { label: 'Windy rain', url: props.windyRain }
    ]
  },
  {
    label: 'Smoke & air',
    icon: 'i-lucide-flame',
    links: [
      { label: 'Meteoblue', url: props.meteoblueAirQuality },
      { label: 'Windy', url: props.windySmoke },
      { label: 'IQAir', url: props.iqair }
    ]
  },
  {
    label: 'Webcams',
    icon: 'i-lucide-camera',
    links: [
      { label: 'Meteoblue', url: props.meteoblueWebcams },
      ...(props.extraWebcams ?? []),
      { label: 'Windy', url: props.windyWebcams }
    ]
  }
]
  .map(group => ({ ...group, links: group.links.filter(link => link.url) }))
  .filter(group => group.links.length))
</script>

<template>
  <div class="rounded-lg border border-default bg-default p-4 flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="font-semibold text-highlighted">
          {{ name }}
        </p>
        <p
          v-if="park"
          class="text-sm text-muted"
        >
          {{ park }}
        </p>
      </div>
      <UButton
        v-if="googleMaps"
        :to="googleMaps"
        target="_blank"
        icon="i-lucide-map-pin"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="`${name} on Google Maps`"
      />
    </div>
    <dl class="grid gap-x-4 gap-y-3 sm:grid-cols-[auto_1fr] sm:items-baseline">
      <template
        v-for="group in groups"
        :key="group.label"
      >
        <dt class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <UIcon
            :name="group.icon"
            class="size-3.5 shrink-0"
          />
          {{ group.label }}
        </dt>
        <dd class="flex flex-wrap gap-1.5 -mt-1.5 sm:mt-0">
          <UButton
            v-for="link in group.links"
            :key="link.url"
            :to="link.url"
            target="_blank"
            :label="link.label"
            color="neutral"
            variant="soft"
            size="xs"
          />
        </dd>
      </template>
    </dl>
  </div>
</template>
