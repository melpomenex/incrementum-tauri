# Change: Add RSS Newsletter Directory

## Why

Users want to subscribe to newsletters (Substack, Beehiiv, etc.) using Incrementum's existing RSS functionality, but:
1. Many users don't know that newsletters often have RSS feeds
2. Finding the RSS feed URL for a newsletter is non-trivial
3. There's no curated list of popular newsletter RSS feeds
4. The RSS feature is not prominently displayed as a newsletter solution

This change makes it easy for users to discover and subscribe to newsletters via RSS.

## What Changes

- **Newsletter Directory Component**: Add a browsable directory of curated newsletter RSS feeds organized by category (Technology, Science, Finance, Health, etc.)

- **Newsletter Feed Discovery**: Add functionality to search and discover RSS feeds from popular newsletter platforms (Substack, Beehiiv, Buttondown, Ghost, etc.)

- **Newsletter Subscription Quick-Add**: Add a "Subscribe to Newsletter" UI that makes it easy to add newsletter feeds with one click

- **Prominent RSS Newsletter Entry Point**: Add a "Newsletters" section to the main navigation or import dialog

- **RSS Feed Auto-Detection**: Add helper to find RSS feed URLs from newsletter URLs (e.g., given `https://author.substack.com`, auto-discover `/feed`)

## Impact

- Affected specs:
  - `newsletter-directory` (new)
- Affected code:
  - Frontend: New `NewsletterDirectory.tsx` component, updates to `RSSReader.tsx` and `ImportPreview.tsx`
  - Data: New `newsletterDirectory.ts` with curated feed data
  - API: Updates to `src/api/rss.ts` for newsletter-specific functions
- Dependencies: None (uses existing RSS infrastructure)
