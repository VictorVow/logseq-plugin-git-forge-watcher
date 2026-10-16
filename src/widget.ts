import { dedupe, getCached, getCachedStale, setCached } from './cache'
import { GitHubError } from './github'
import { linkExternalIconSvg } from './icons'
import { decodeUrl, type LinkKind } from './parse-link'

// The shared render pipeline behind every widget: parse the macro's URL, serve
// from cache within the TTL, otherwise show a neutral placeholder and fetch
// (deduped across blocks), falling back to the last known state — dimmed — if
// the fetch fails, and to the placeholder plus an error hint if nothing was
// ever cached. Each widget kind only supplies how to parse, fetch and draw.

// Where a widget is mounted. Its buttons carry these along so a click can
// re-render this exact widget.
export interface WidgetContext {
  slot: string
  encodedUrl: string
}

export interface WidgetSpec<Ref extends { url: string }, Result> {
  kind: LinkKind
  /** Used in "⚠ no GitHub <noun> link" when the URL doesn't parse. */
  noun: string
  parse: (url: string) => Ref | null
  cacheKey: (ref: Ref) => string
  fetch: (ref: Ref, token?: string) => Promise<Result>
  /** Widget contents for a fetched (or cached) result. */
  draw: (result: Result, ref: Ref, ctx: WidgetContext) => string
  /** Neutral contents shown while loading, and alongside an error hint. */
  placeholder: (ref: Ref, ctx: WidgetContext) => string
  /** Extra inline styles for the outer shell (default: vertically centred). */
  shellStyle?: string
}

export type Renderer = (
  slot: string,
  encodedUrl: string,
  force?: boolean,
) => Promise<void>

export const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  )

// Data attributes that wire an element up to the `gfwRefresh` click model
// (registered in `render.ts`), which force-refreshes this widget.
export const refreshAttrs = (kind: LinkKind, ctx: WidgetContext): string =>
  `data-on-click="gfwRefresh" data-kind="${kind}"
        data-slot="${ctx.slot}" data-url="${ctx.encodedUrl}"`

// The square status-icon button used by the branch, issue and PR widgets.
// Clicking it force-refreshes the widget.
export const statusButton = (
  kind: LinkKind,
  ctx: WidgetContext,
  title: string,
  icon: string,
): string => `
  <span class="gfw-${kind}-btn" ${refreshAttrs(kind, ctx)}
        title="${title}"
        style="display:inline-flex;align-items:center;justify-content:center;
               width:22px;height:22px;border-radius:6px;cursor:pointer;
               border:1px solid var(--ls-border-color, #30363d);
               background:var(--ls-secondary-background-color, transparent);">
    ${icon}
  </span>`

export const openLink = (url: string, title: string, style = ''): string => `
  <a class="gfw-open" href="${url}" target="_blank" rel="noopener"
     title="${title}"
     style="display:inline-flex;align-items:center;${style}text-decoration:none;
            color:var(--ls-secondary-text-color, #848d97);">
    ${linkExternalIconSvg('currentColor')}
  </a>`

// `stale` dims the widget and explains it via a tooltip — used when we're
// showing a cached value because a refetch failed (e.g. offline).
const shell = (
  kind: LinkKind,
  inner: string,
  style: string,
  stale = false,
): string => `
  <span class="gfw-${kind}-widget"${stale ? ' title="Offline — showing last known state"' : ''}
        style="display:inline-flex;align-items:center;gap:6px;
               margin-right:6px;${style}${stale ? 'opacity:0.55;' : ''}">
    ${inner}
  </span>`

const ttlMs = (): number =>
  (Number(logseq.settings?.cacheTtlHours ?? 24) || 24) * 60 * 60 * 1000

export const defineWidget =
  <Ref extends { url: string }, Result>(
    spec: WidgetSpec<Ref, Result>,
  ): Renderer =>
  async (slot, encodedUrl, force = false) => {
    const ctx: WidgetContext = { slot, encodedUrl }
    const show = (inner: string, stale = false) =>
      logseq.provideUI({
        key: `gfw-${spec.kind}-${slot}`,
        slot,
        reset: true,
        template: shell(
          spec.kind,
          inner,
          spec.shellStyle ?? 'vertical-align:middle;',
          stale,
        ),
      })

    const ref = spec.parse(decodeUrl(encodedUrl))
    if (!ref) {
      show(
        `<span style="color:#f85149;font-size:12px;">⚠ no GitHub ${spec.noun} link</span>`,
      )
      return
    }

    const draw = (result: Result, stale = false) =>
      show(spec.draw(result, ref, ctx), stale)

    // Serve from cache unless this is a forced refresh.
    const ck = spec.cacheKey(ref)
    if (!force) {
      const cached = getCached<Result>(ck, ttlMs())
      if (cached) {
        draw(cached)
        return
      }
    }

    // Cache miss (or forced) — show a neutral loading state, then fetch.
    show(spec.placeholder(ref, ctx))

    try {
      const token = (logseq.settings?.githubToken as string) || undefined
      const result = await dedupe(ck, () => spec.fetch(ref, token))
      setCached(ck, result)
      draw(result)
    } catch (err) {
      console.error(`[github-watcher] ${spec.kind} render failed`, err)
      // Prefer the last known state over an error when we have one cached.
      const stale = getCachedStale<Result>(ck)
      if (stale) {
        draw(stale, true)
        return
      }
      const rateLimited = err instanceof GitHubError && err.rateLimited
      const hint = rateLimited
        ? logseq.settings?.githubToken
          ? 'rate limited'
          : 'rate limited — add a GitHub token in settings'
        : 'API error'
      show(
        spec.placeholder(ref, ctx) +
          `<span style="color:#848d97;font-size:11px;">${hint}</span>`,
      )
    }
  }
