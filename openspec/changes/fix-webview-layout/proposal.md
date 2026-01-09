# Fix Webview Layout Sizing

## Metadata
- **Change ID:** fix-webview-layout
- **Author:** Gemini
- **Status:** Proposed
- **Created:** 2026-01-09

## Summary
Fix the layout issue where the native webview in the Web Browser tab only occupies half of the available space, or causes the application view to be misaligned. Ensure the webview fills the entire tab content area below the toolbar.

## Problem Statement
When a user navigates to a web page in the Web Browser tab, the view is split: the "regular" app view occupies the top half of the screen, and the web page (presumably) occupies the rest or is sized incorrectly. The expected behavior is for the web page to fill the entire tab area (excluding the browser toolbar).

## Proposed Solution
- Update `WebBrowserTab.tsx` to ensure the container div has correct flexbox properties (`flex-1`, `h-full`, `min-h-0`) to fill the available space.
- Verify and correct the `updateWebviewBounds` calculation to ensure it uses the correct container dimensions relative to the window.
- Ensure the parent `TabContent` component correctly propagates height and width.

## Scope
- `src/components/tabs/WebBrowserTab.tsx`: Layout and bounds calculation updates.
- `src/components/common/Tabs/TabContent.tsx`: (Optional) Container styling adjustments if needed.

## Risks
- Incorrect bounds calculation could lead to the webview floating over other UI elements (like the sidebar or toolbar).
- `devicePixelRatio` issues might cause sizing discrepancies on high-DPI screens (though `LogicalSize` should handle this).
