<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')

const { header } = useAppConfig()
</script>

<template>
  <UHeader
    :ui="{ center: 'flex-1' }"
    :to="header?.to || '/'"
  >
    <UContentSearchButton
      v-if="header?.search"
      :collapsed="false"
      class="w-full"
    />

    <template
      v-if="header?.logo?.dark || header?.logo?.light || header?.title"
      #title
    >
      <UColorModeImage
        v-if="header?.logo?.dark || header?.logo?.light"
        :light="header?.logo?.light!"
        :dark="header?.logo?.dark!"
        :alt="header?.logo?.alt"
        class="h-6 w-auto shrink-0"
      />

      <span v-else-if="header?.title">
        {{ header.title }}
      </span>
    </template>

    <template
      v-else
      #left
    >
      <!-- Added the class to align the logo and AHR -->
      <NuxtLink
        :to="header?.to || '/'"
        class="flex items-center gap-2"
      >
        <AppLogo class="w-auto h-6 shrink-0 text-primary" />
        Alberta Hiking Resources
      </NuxtLink>

      <!-- <TemplateMenu /> -->
    </template>

    <template #right>
      <UContentSearchButton
        v-if="header?.search"
        class="lg:hidden"
      />

      <UColorModeButton v-if="header?.colorMode" />

      <!-- The links are icon-only, so the tooltip is what tells a sighted
           reader that the clock icon is the changelog. -->
      <template v-if="header?.links">
        <UTooltip
          v-for="(link, index) of header.links"
          :key="index"
          :text="link['aria-label']"
        >
          <UButton v-bind="{ color: 'neutral', variant: 'ghost', ...link }" />
        </UTooltip>
      </template>
    </template>

    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
