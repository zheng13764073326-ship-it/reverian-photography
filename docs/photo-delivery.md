# Photo delivery and loading

Production builds (`npm run build:production`, including Cloudflare Pages builds) first render published Sanity content, then run `scripts/localize-images.mjs` before the built-page checks.

The localizer downloads each referenced Sanity image variant into `apps/web/dist/_photos/`, using a hash of the source URL as its filename. It preserves requested dimensions, cropping and focal points, and requests JPEG explicitly for consistent browser support. Original assets and CMS documents are unchanged. Responsive candidates, image fallbacks, lightbox links, map previews and social previews all use the resulting static files. Social preview URLs are absolute; browser URLs are relative to the current site.

Downloads use bounded concurrency and retries. A failed or invalid image stops the production build before HTML URLs are rewritten, leaving the previous deployment live. The ignored `node_modules/.cache/reverian-images/` directory can reuse successful downloads. Hashed image URLs receive an immutable cache header. `scripts/check-built.mjs` checks that every generated image reference exists and no Sanity image URL remains in production HTML. Development and demo mode keep their existing image sources.

`ImageLoading.astro` installs the shared image recovery handler. A failed image becomes transparent while its existing placeholder and dimensions remain. Where supplied, the handler retries a smaller variant; it makes at most two retries. Descriptive alt text remains available to assistive technology but is not visibly painted over broken images. Lightbox navigation and close cancel pending retries so an old image cannot reappear.

Lightbox descriptions retain the full source text. Captions without a note back remain in the scrollable footer; the footer height observer reserves space so they cannot cover the framed photograph. Photo notes preserve paragraphs on the reverse of the paper.

Validation: `npm run check`, `npm test`, and `npm run build:production`. Browser checks should cover mobile and desktop albums with the Sanity CDN blocked, a failed preferred image with a working fallback, persistent failure, and lightbox navigation/close during retry.


## Shared photo-paper viewer (2026-11-25)

All photos opened with `Lightbox.astro` share the floating entrance, off-white paper border, shadow, and original aspect ratio. Ordinary photos remain on the front and have no flip control. Directly opening a marked photo retains its existing entrance followed by the automatic turn to its note. Film frames use the same paper stage while retaining frame numbers, author captions, and the preview-to-original image swap.

On-screen arrows, keyboard Left/Right, and touch swipes navigate the current group. Navigation starting on the photograph front keeps the next photograph on its front, including photos with notes; the flip control or a tap on that photo can reveal its note. Navigation cancels the previous entrance and delayed flip so fast switching cannot turn a later photo unexpectedly. Controls sit above the paper and remain clickable on either face.

Short landscape screens reserve extra top space for the header. Long captions reserve footer space, portrait frames fit without cropping, Escape restores focus to the original thumbnail, and reduced-motion preferences suppress the entrance and rotation.

Validation: 72 Astro files plus Studio/Functions type checks passed; 62 existing tests passed; production build passed for 18 pages, 1170 local references, and 712 WebP assets. Browser checks covered 320, 390, 768, and 1440px portrait/desktop layouts plus 844×390 landscape, mouse/keyboard/touch navigation, manual and automatic note turns, quick navigation, Escape focus, portrait film, full captions, and reduced motion.
