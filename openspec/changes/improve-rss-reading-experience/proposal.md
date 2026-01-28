# Proposal: Improve RSS Reading Experience

## Problem
The current RSS reader applies "mobile" reading styles that may not be optimal for all users or devices (especially desktop). Users lack control over typography, spacing, and layout of the article content itself, making long-form reading less comfortable.

## Solution
Introduce a dedicated "Reader" customization section that allows users to control typography (font, size, line height), layout (width, alignment), and theme details for the article view. These settings will apply consistently across both mobile and desktop views, promoting a "Reader Mode" experience.

## Scope
- **RSS Reader:** Update `RSSReader.tsx` to apply configurable reading styles.
- **Customization Panel:** Add a new "Reader" tab to `RSSCustomizationPanel.tsx` with typography and layout controls.
- **Styling:** Refactor `src/styles/mobile.css` to expose reusable reading variables and classes that work on desktop.
- **State:** Persist these preferences in the RSS user preferences.

## Risks
- **Performance:** Dynamic style application should be efficient to avoid layout shifts.
- **Consistency:** Need to ensure these styles don't conflict with global Tailwind typography defaults (`prose` class).
