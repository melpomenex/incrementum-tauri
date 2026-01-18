# Change: Update mobile reading experience and density for PWA

## Why
The PWA mobile UI feels spacious and the reading view does not yet feel premium or efficient on small screens. Improving typography, spacing, and information density will make reading feel more refined and allow users to see more content without sacrificing readability.

## What Changes
- Define a mobile reading experience for RSS, EPUB, and HTML/Markdown with consistent typography and chrome behavior
- Introduce a compact mobile density profile across PWA views while preserving tap target accessibility
- Align reading surface layout rules (margins, line length, spacing) for a more premium, focused feel

## Impact
- Affected specs: new capabilities `mobile-reading-experience`, `mobile-layout-density`
- Related changes: `update-mobile-epub-reader-ux`, `update-pwa-mobile-navigation`
- Affected code: PWA mobile styles, reading views (RSS, EPUB, HTML/Markdown)
