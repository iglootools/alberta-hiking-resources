import { useRequest } from 'nitro/context'
import { H3Event } from 'nitro/h3'

/**
 * The event of the request being handled, for code that is not handed one,
 * such as an MCP tool handler.
 *
 * Nitro v3 exposes only the request through its async context
 * (`experimental.asyncContext`), not h3's event: `useEvent()` is Nitro v2's,
 * and without the compatibility layer it is not defined. An h3 v2 event built
 * on that request shares its context (h3 reuses `request.context`), and it has
 * the shape `nuxt/server` utilities and `@nuxt/content`'s server queries take.
 */
export function currentRequestEvent(): H3Event {
  return new H3Event(useRequest())
}
