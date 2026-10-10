<script setup lang="ts">
const { footer } = useAppConfig()
</script>

<template>
  <UFooter>
    <template #left>
      <span>
        {{ footer.credits }}
        <template v-if="footer.license">
          · Content under
          <ULink
            :to="footer.license.to"
            target="_blank"
            class="text-default hover:text-primary"
          >{{ footer.license.label }}</ULink>
        </template>
        · Built with Nuxt UI
      </span>
    </template>

    <template #right>
      <UColorModeButton v-if="footer?.colorMode" />

      <template v-if="footer?.links">
        <UButton
          v-for="(link, index) of footer?.links"
          :key="index"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>
    </template>
  </UFooter>
</template>
