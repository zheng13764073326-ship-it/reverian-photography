# Photo delivery and loading

Production builds (`npm run build:production`, including Cloudflare Pages builds) first render published Sanity content, then run `scripts/localize-images.mjs` before the built-page checks.

The localizer downloads each referenced Sanity image variant into `apps/web/dist/_photos/`, using a hash of the source URL as its filename. It preserves requested dimensions, cropping and focal points, and requests JPEG explicitly for consistent browser support. Original assets and CMS documents are unchanged. Responsive candidates, image fallbacks, lightbox links, map previews and social previews all use the resulting static files. Social preview URLs are absolute; browser URLs are relative to the current site.

Downloads use bounded concurrency and retries. A failed or invalid image stops the production build before HTML URLs are rewritten, leaving the previous deployment live. The ignored `node_modules/.cache/reverian-images/` directory can reuse successful downloads. Hashed image URLs receive an immutable cache header. `scripts/check-built.mjs` checks that every generated image reference exists and no Sanity image URL remains in production HTML. Development and demo mode keep their existing image sources.

`ImageLoading.astro` installs the shared image recovery handler. A failed image becomes transparent while its existing placeholder and dimensions remain. Where supplied, the handler retries a smaller variant; it makes at most two retries. Descriptive alt text remains available to assistive technology but is not visibly painted over broken images. Lightbox navigation and close cancel pending retries so an old image cannot reappear.

Lightbox descriptions retain the full source text. CSS collapses manual line breaks and blank lines into continuous text with a 1.65 line height. Long descriptions remain scrollable, and the footer height observer keeps them clear of the photograph.

Validation: `npm run check`, `npm test`, and `npm run build:production`. Browser checks should cover mobile and desktop albums with the Sanity CDN blocked, a failed preferred image with a working fallback, persistent failure, and lightbox navigation/close during retry.
