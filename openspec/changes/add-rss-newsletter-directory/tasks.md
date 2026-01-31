## 1. Data Preparation

- [ ] 1.1 Create `src/data/newsletterDirectory.ts` with curated newsletter feeds
- [ ] 1.2 Add newsletter categories (Technology, Science, Finance, Health, Business, Lifestyle, Politics, Arts)
- [ ] 1.3 Include popular newsletters in each category with RSS feed URLs

## 2. Newsletter Directory Component

- [ ] 2.1 Create `NewsletterDirectory.tsx` component with category browsing
- [ ] 2.2 Add newsletter card display with title, description, author, and subscribe button
- [ ] 2.3 Add search/filter functionality for browsing newsletters
- [ ] 2.4 Add "Subscribe" button that adds feed to user's subscriptions

## 3. Newsletter Feed Discovery

- [ ] 3.1 Add `discoverNewsletterFeedUrl()` function to `rss.ts` for auto-detecting RSS from newsletter URLs
- [ ] 3.2 Support Substack (`/feed` endpoint)
- [ ] 3.3 Support Beehiiv (`/feed` endpoint)
- [ ] 3.4 Support Ghost blogs (`/rss` endpoint)
- [ ] 3.5 Add generic RSS auto-discovery from HTML `<link>` tags

## 4. UI Integration

- [ ] 4.1 Add "Newsletters" button/section to main navigation
- [ ] 4.2 Add "Import Newsletter" option to existing import dialog
- [ ] 4.3 Update `ImportPreview.tsx` to show newsletter quick-add options
- [ ] 4.4 Add newsletter category badges to RSS feed items

## 5. Polish & UX

- [ ] 5.1 Add empty states and loading states
- [ ] 5.2 Add error handling for invalid newsletter URLs
- [ ] 5.3 Add success feedback when subscribing to newsletters
- [ ] 5.4 Ensure mobile responsiveness

## 6. Documentation

- [ ] 6.1 Add newsletter subscription guide to user handbook
- [ ] 6.2 Document supported newsletter platforms
- [ ] 6.3 Add FAQ entry for "How do I add newsletters to Incrementum?"
