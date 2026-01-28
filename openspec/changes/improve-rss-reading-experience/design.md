# Design: RSS Reading Experience Improvements

## Architecture

The solution builds upon the existing `RSSUserPreference` system. We will add new fields to store styling preferences. These preferences will be injected as CSS variables or inline styles into the reader container.

## CSS Strategy

Currently, `mobile.css` defines:
```css
:root {
  --mobile-reading-font-family: ...;
  --mobile-reading-font-size: 16px;
  /* ... */
}
```

We will promote these to more general `--reading-*` variables:
```css
:root {
  --reading-font-family: ...;
  --reading-font-size: 16px;
  --reading-line-height: 1.6;
  --reading-max-width: 65ch;
}
```

The `RSSReader` component will map the user's stored preferences to these variables on the container element:

```tsx
<div 
  className="reading-surface ..." 
  style={{
    "--reading-font-family": preferences.font_family,
    "--reading-font-size": `${preferences.font_size}px`,
    // ...
  }}
>
  ...
</div>
```

## Data Model Changes

Update `RSSUserPreference` interface:

```typescript
export interface RSSUserPreference {
  // ... existing fields
  font_family?: string; // 'serif', 'sans', 'mono'
  font_size?: number;   // px
  line_height?: number; // unitless
  max_width?: number;   // ch or px (or % for slider)
  text_align?: string;  // 'left', 'justify'
}
```

## UI Components

New `ReaderTab` in `RSSCustomizationPanel`:
- Font Family Selector (Visual preview if possible)
- Font Size Slider (12px - 32px)
- Line Height Slider (1.0 - 2.5)
- Max Width Slider (Narrow - Wide)
