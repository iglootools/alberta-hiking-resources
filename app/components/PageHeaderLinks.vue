<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { withoutTrailingSlash } from 'ufo'

const route = useRoute()
const toast = useToast()
const { copy, copied } = useClipboard()
const site = useSiteConfig()

const routePath = computed(() => withoutTrailingSlash(route.path))
const mdPath = computed(() => `${site.url}/raw${routePath.value}.md`)

const items = [
  {
    label: 'Copy Markdown link',
    icon: 'i-lucide-link',
    async onSelect() {
      if (await copyOrWarn(mdPath.value)) {
        toast.add({
          title: 'Copied to clipboard',
          icon: 'i-lucide-check-circle'
        })
      }
    }
  },
  {
    label: 'View as Markdown',
    icon: 'i-lucide-file-text',
    target: '_blank',
    to: `/raw${routePath.value}.md`
  },
  {
    label: 'Open in ChatGPT',
    icon: 'i-lucide-bot',
    target: '_blank',
    to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(`Read ${mdPath.value} so I can ask questions about it.`)}`
  },
  {
    label: 'Open in Claude',
    icon: 'i-lucide-bot',
    target: '_blank',
    to: `https://claude.ai/new?q=${encodeURIComponent(`Read ${mdPath.value} so I can ask questions about it.`)}`
  }
]

function warn(title: string, description: string) {
  toast.add({ title, description, color: 'error', icon: 'i-lucide-circle-x' })
}

/**
 * Copies `text`, warning the reader when it could not be: `copy` resolves
 * without error where the browser has no clipboard at all, and only leaves
 * `copied` false.
 */
async function copyOrWarn(text: string): Promise<boolean> {
  await copy(text)
  if (!copied.value) warn('Could not copy', 'This browser does not allow copying to the clipboard.')
  return copied.value
}

async function copyPage() {
  let markdown: string
  try {
    markdown = await $fetch<string>(`/raw${routePath.value}.md`)
  } catch (error) {
    console.error('[PageHeaderLinks] could not fetch the page as Markdown', error)
    warn('Could not copy the page', 'Its Markdown could not be fetched. Try again, or use View as Markdown.')
    return
  }
  await copyOrWarn(markdown)
}
</script>

<template>
  <UFieldGroup>
    <UButton
      label="Copy page"
      :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
      color="neutral"
      variant="outline"
      :ui="{
        leadingIcon: [copied && 'text-primary', 'size-3.5']
      }"
      @click="copyPage"
    />
    <UDropdownMenu
      :items="items"
      :content="{
        align: 'end',
        side: 'bottom',
        sideOffset: 8
      }"
      :ui="{
        content: 'w-48'
      }"
    >
      <UButton
        icon="i-lucide-chevron-down"
        size="sm"
        color="neutral"
        variant="outline"
        aria-label="Open copy actions menu"
      />
    </UDropdownMenu>
  </UFieldGroup>
</template>
