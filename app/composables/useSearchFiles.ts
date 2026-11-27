/**
 * The content search's sections, fetched the first time a reader opens the
 * search palette rather than on every page load.
 *
 * On the static build @nuxt/content answers this query in the browser, which
 * means downloading the SQLite WASM engine and the whole content dump, over
 * 1 MB before compression. Most readers never open search, and many read on a
 * phone at a trailhead.
 */
export function useSearchFiles() {
  const { data: files, status, execute } = useLazyAsyncData('search', () => queryCollectionSearchSections('docs'), {
    server: false,
    immediate: false
  })
  const { open } = useContentSearch()
  // A failed load is retried the next time the palette opens.
  watch(open, (isOpen) => {
    if (isOpen && (status.value === 'idle' || status.value === 'error')) execute()
  }, { immediate: true })
  return files
}
