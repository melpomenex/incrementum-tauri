# Incrementum User Handbook

**Your Complete Guide to Mastering Incremental Reading and Spaced Repetition**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Document Management](#document-management)
4. [The Learning System](#the-learning-system)
5. [Review Process](#review-process)
6. [Queue Management](#queue-management)
7. [Analytics & Progress Tracking](#analytics--progress-tracking)
8. [Settings & Customization](#settings--customization)
9. [Advanced Features](#advanced-features)
10. [Tips & Best Practices](#tips--best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Incrementum?

Incrementum is a powerful learning application that combines two proven techniques:

**Incremental Reading** - Process large amounts of information in small, manageable chunks over time. Instead of reading articles cover-to-cover, you extract key points and gradually build understanding.

**Spaced Repetition** - Review material at scientifically-optimized intervals to maximize retention. The FSRS-5 algorithm predicts when you're about to forget and schedules reviews just in time.

### Key Concepts

- **Documents**: Source materials (PDFs, EPUBs, articles, videos)
- **Extracts**: Key points or sections you've extracted from documents
- **Learning Items**: Flashcards or Q&A cards created from extracts
- **Queue**: Items scheduled for review, organized by priority
- **Reviews**: Sessions where you actively recall and rate your knowledge

---

## Getting Started

### First Launch

When you first launch Incrementum, you'll see the **Dashboard** with four main sections:

1. **Queue** - Your review queue (empty at first)
2. **Review** - Active review session
3. **Documents** - Your document library
4. **Analytics** - Progress statistics

### Initial Setup

1. **Choose a Theme** - Navigate to Settings → Appearance → Theme
   - 17 built-in themes available (6 dark, 11 light)
   - Try "Modern Dark" or "Material You" for a modern look

2. **Configure Review Settings** - Settings → Learning → Algorithm
   - **Algorithm**: FSRS-5 (recommended) or SM-2
   - **Desired Retention**: 90% (default) - targets how well you want to remember
   - **Learn Per Day**: 20-50 items recommended for beginners

3. **Set Up Categories** - Settings → Categories
   - Create categories for different subjects (e.g., "Programming", "Science", "Languages")
   - Categories help organize and filter your learning materials

### Your First Document

Let's import your first document:

1. Click **Documents** in the sidebar
2. Click the **Import** button (top-right)
3. Choose your import method:
   - **Local File**: Select a PDF, EPUB, or text file
   - **URL**: Paste any web URL
   - **Arxiv**: Paste a research paper ID or URL
4. Wait for processing (auto-segmentation begins automatically)

---

## Document Management

### Import Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| **PDF** | Portable Document Format | Research papers, ebooks, documentation |
| **EPUB** | Electronic Publication | Books, articles with reflowable text |
| **Markdown** | `.md` files | Technical documentation, notes |
| **HTML** | Web pages | Articles, blog posts |
| **Anki (.apkg)** | Anki deck package | Migrate from Anki |
| **SuperMemo** | ZIP exports | Migrate from SuperMemo |
| **URL** | Any web link | Online articles, blogs |
| **Arxiv** | Academic papers | Research literature |
| **Screenshot** | Screen capture | Quick captures from any app |

### Importing Documents

#### Method 1: Local Files

1. Click **Documents** → **Import**
2. Select **Local File**
3. Navigate to your file and select it
4. Incrementum will:
   - Extract text content
   - Auto-segment into sections
   - Calculate reading time and word count
   - Extract metadata (title, author, etc.)

#### Method 2: URL Import

1. Copy any web URL
2. Click **Documents** → **Import** → **URL**
3. Paste the URL
4. Click **Import**
5. Incrementum fetches and processes the content

**Supported Sites:**
- News articles (most major sites)
- Blog posts
- Documentation pages
- Medium, Substack, etc.

#### Method 3: Arxiv Papers

1. Find an Arxiv paper (e.g., `https://arxiv.org/abs/2301.07041`)
2. Copy the URL or paper ID (`2301.07041`)
3. Click **Documents** → **Import** → **Arxiv**
4. Paste the URL or ID
5. Incrementum downloads:
   - Full PDF
   - Abstract
   - Authors
   - Publication date
   - References

### Document Viewer

Once imported, open any document to access:

**Viewer Features:**
- **Page Navigation**: Scroll through pages/sections
- **Zoom**: Adjust text size
- **Full Screen**: Distraction-free reading
- **Search**: Find text within document
- **Table of Contents**: Jump to sections (if available)

**Annotation Tools:**
1. **Highlight Text**: Select text → Choose highlight color
   - Yellow: Important concepts
   - Green: Examples
   - Blue: Definitions
   - Red: Critical points
   - Purple: Related topics

2. **Create Extract**: Select text → Click "Extract" button
   - Extract appears in Extracts tab
   - Can be converted to flashcard later

3. **Add Note**: Select text → Click "Note" button
   - Attach your thoughts/notes
   - Notes appear with extracts

### Document Organization

**Categories:**
- Assign each document to a category
- Filter documents by category
- Categories inherit to extracts and cards

**Tags:**
- Add custom tags to documents
- Use tags for cross-category organization
- Examples: `#urgent`, `#research`, `#tutorial`

**Search:**
- Full-text search across all documents
- Filter by category, tags, date range
- Sort by title, date, word count

---

## The Learning System

### Understanding FSRS-5

**FSRS-5** (Free Spaced Repetition Scheduler) is a modern algorithm that:

1. **Tracks Memory State**: Models your memory strength for each card
2. **Predicts Forgetting**: Estimates when you'll forget each item
3. **Optimizes Scheduling**: Schedules reviews at optimal times
4. **Adapts to You**: Learns from your performance patterns

**Key Metrics:**
- **Stability**: How long a memory lasts (higher = more stable)
- **Difficulty**: How hard the item is for you (1-10 scale)
- **Retrievability**: Current probability of recall (0-100%)

### Rating System

During reviews, rate each item based on your recall:

| Rating | Label | Description | Typical Interval |
|--------|-------|-------------|------------------|
| **1** | Again | Complete blackout | ~10 minutes |
| **2** | Hard | Remembered with significant effort | 1-2 days |
| **3** | Good | Remembered with some thought | 5-7 days |
| **4** | Easy | Recall was effortless | 10-14 days |

**Preview Intervals:**
Before rating, Incrementum shows you exactly when each card will appear next for all four rating options. Use this to optimize your schedule!

### Card Types

#### 1. Basic Flashcards
Simple front/back cards

**Front:** What is the capital of France?
**Back:** Paris

**Best for:** Facts, definitions, vocabulary

#### 2. Cloze Deletion
Fill-in-the-blank style

**Text:** The capital of {{France}} is Paris.

**Displays as:** The capital of _____ is Paris.

**Best for:** Contextual learning, relationships

#### 3. Q&A Cards
Question and answer pairs

**Q:** Explain the difference between TCP and UDP.
**A:** TCP is connection-oriented with guaranteed delivery; UDP is connectionless without guarantees.

**Best for:** Concepts, explanations

#### 4. Image Occlusion
Hide parts of an image (diagrams, charts)

**Best for:** Anatomy, maps, diagrams

### Creating Cards

#### From Extracts

1. While reading, select important text
2. Click **Extract** to create an extract
3. In the **Extracts** tab, review your extracts
4. Click **Create Card** on any extract
5. Choose card type (Flashcard, Cloze, Q&A)
6. Edit the card content
7. Click **Save**

The card is now scheduled for review!

#### Manual Creation

1. Click **Queue** → **Add Item**
2. Choose card type
3. Enter front/back content
4. Select category
5. Click **Create**

#### AI-Powered Generation

If you have AI configured:

1. Select an extract or document section
2. Click **Generate Cards**
3. AI will create multiple cards automatically
4. Review and edit as needed
5. Save the best ones

---

## Review Process

### Starting a Review Session

1. Click **Review** in the sidebar
2. See cards due today (and upcoming)
3. Click **Start Review** to begin

### Review Interface

**Card Display:**
- Front of card shown (question or prompt)
- Press **Space** or click to reveal answer
- Answer appears below

**Mixed Review Sessions (Cards + Documents):**
- Review sessions can include **learning items** and **documents** that are due for reading.
- When a document appears, you can open it directly from the session card.
- Rating a document schedules its next reading date, just like a card schedules its next review.

**Rating Interface:**
After revealing answer, four rating buttons appear:

```
[Again] [Hard] [Good] [Easy]
  ~10m   ~2d    ~7d    ~14d
```

Each button shows the **next review date** - this is the **Preview Interval** feature!

**Recovery Actions (Review Queue Inspector):**
Use these when a learning item’s schedule needs a quick nudge:

- **Compress intervals**: Pull the next review closer (shorter interval).
- **Reschedule intelligently**: Move the item to “due now”.
- **Downgrade frequency**: Push the next review out (longer interval).

These actions apply to **learning items only** and update the schedule immediately.

### Keyboard Shortcuts (Review Mode)

| Key | Action |
|-----|--------|
| `Space` | Show answer |
| `1` | Rate "Again" |
| `2` | Rate "Hard" |
| `3` | Rate "Good" (recommended default) |
| `4` | Rate "Easy" |
| `Ctrl+Enter` | Show answer |
| `Ctrl+1/2/3/4` | Rate without showing answer |
| `Esc` | Pause/end session |
| `Ctrl+E` | Edit current card |
| `Ctrl+D` | Delete current card |

### Session Management

**Review Session Features:**
- **Progress Bar**: Shows cards remaining
- **Time Tracking**: Shows session duration
- **Break Timer**: Optional breaks every N cards
- **Session Limits**: Set max cards or time per session

**Ending a Session:**
- Click **Finish** when done
- Or set a limit (Settings → Review → Session Limits)
- Unfinished cards remain due for next session

### Review Strategies

#### Daily Review Routine

1. **Morning Session** (15-30 min)
   - Review cards due overnight
   - Focus on harder items

2. **Evening Session** (15-30 min)
   - Review cards added during day
   - Create new cards from reading

#### Managing Backlog

If you have many cards due (>100):

1. **Focus on New Cards**: Limit review to 20-30/day
2. **Use Filters**: Review by category (don't overwhelm)
3. **Cram Sessions**: Weekend catch-up sessions
4. **Adjust Retention**: Temporarily lower to 85% (fewer reviews)

#### Dealing with "Again" Cards

Cards rated "Again" reappear quickly (10 min). Strategies:

- **Immediate Relearning**: Review again cards within same session
- **Separate Session**: Review again cards later in day
- **Understanding Issues**: If many agains, card may be poorly written

---

## Queue Management

### Understanding the Queue

The **Queue** contains all items scheduled for review, organized by:

- **Due Date**: Items due sooner appear first
- **Priority**: User-set priority (0-100)
- **Category**: Subject area
- **Card Type**: Flashcard, cloze, etc.

### Queue Views

#### Due View
Shows items due today and overdue, sorted by due time

#### Scheduled View
Shows all scheduled items, including future reviews

#### New View
Shows newly created cards not yet reviewed

### Queue Operations

**Filtering:**
- By category (e.g., "Show only Programming")
- By card type (e.g., "Show only Cloze cards")
- By priority range (e.g., "Show priority 80+")

**Sorting:**
- Due date (default)
- Priority
- Difficulty
- Random (for variety)

**Bulk Actions:**
1. Select multiple items (checkboxes)
2. Choose action:
   - **Change Category**: Move to different category
   - **Set Priority**: Bulk update priority
   - **Suspend**: Temporarily hide from reviews
   - **Delete**: Remove permanently

### Priority System

Set priority 0-100 on any item:

- **100**: Critical (must learn)
- **80-90**: Important
- **60-70**: Normal priority
- **40-50**: Low priority
- **0-20**: Archive/reference

**Priority Scheduling:**
Higher priority items are shown more frequently in mixed reviews.

### Smart Queues

Create custom queues with filters:

**Example Queues:**
- "Today's Focus": Due cards from main category
- "Quick Review": Easy cards, priority < 50
- "Deep Dive": Hard cards from research category
- "Exam Prep": All cards in "Biology" category

**Creating Smart Queue:**
1. Click **Queue** → **Saved Queues**
2. Click **New Queue**
3. Set filters and sort order
4. Name and save

---

## Analytics & Progress Tracking

### Dashboard Overview

The Analytics dashboard provides comprehensive insights:

**Key Metrics:**
- **Cards Due Today**: Number awaiting review
- **Total Cards**: All cards in system
- **Retention Rate**: Percentage remembered
- **Study Streak**: Consecutive days of activity
- **Cards Learned**: Total cards created

### Activity Charts

**30-Day Activity:**
- Bar chart showing reviews per day
- Color-coded by rating (Again/Hard/Good/Easy)
- Identify patterns in your study habits

**Learning Curve:**
- Line chart showing total cards over time
- Track growth of your knowledge base

### Statistics

**Review Stats:**
- Total reviews completed
- Average rating distribution
- Reviews per day/week/month

**Card Stats:**
- Total cards by category
- Cards by type (Flashcard, Cloze, etc.)
- New vs. mature cards

**Algorithm Metrics (FSRS):**
- Average stability
- Average difficulty
- Predicted retention
- Memory performance

### Category Breakdown

View performance by subject area:

- Cards per category
- Retention rate per category
- Activity level per category
- Identify strong/weak areas

### Goals & Streaks

**Setting Goals:**
1. Click **Analytics** → **Goals**
2. Set daily/weekly targets:
   - Cards to review
   - Cards to create
   - Study time
3. Track progress visual indicators

**Study Streaks:**
- Consecutive days with activity
- Current streak displayed on dashboard
- Maintain streaks for motivation

### Export Statistics

Export your data for analysis:

1. Click **Analytics** → **Export**
2. Choose format:
   - **CSV**: Spreadsheet compatible
   - **JSON**: For custom analysis
   - **PDF**: Printable report
3. Select date range
4. Include metrics (reviews, cards, retention)

---

## Settings & Customization

### Appearance Settings

#### Themes
- **17 Built-in Themes**: Choose from dark and light themes
- **Live Preview**: See theme changes instantly
- **Custom Themes**: Create your own color schemes

**Theme Options:**
- Modern Dark (default dark)
- Material You (Material Design 3)
- Aurora Light
- Ice Blue
- And 13 more...

#### Custom Theme Creation

1. Settings → Appearance → Customize Theme
2. Adjust colors:
   - Primary color
   - Background color
   - Text color
   - Accent colors
3. Save as custom theme
4. Export/import themes for sharing

#### Display Options
- **Dense Mode**: Show more content per screen
- **Font Size**: Adjust text size
- **Card Animation**: Enable/disable animations
- **Show Preview Intervals**: Display next review dates

### Learning Settings

#### Algorithm Selection

**FSRS-5 (Recommended):**
- Modern, research-backed
- Adapts to individual memory
- Predicts forgetting times
- Better retention with fewer reviews

**SM-2 (Classic):**
- Traditional SuperMemo 2 algorithm
- Simpler, predictable
- More reviews required

#### Parameters

**Desired Retention:** 0.70 - 0.95
- **90%** (default): Balances retention and review load
- **85%**: Fewer reviews, slightly less retention
- **95%**: Maximum retention, more reviews

**Learn Per Day:** 10 - 100
- **20** (default): Manageable for most users
- **50**: For intensive study periods
- **10**: Light review load

**Review Per Day:** 50 - 500
- **200** (default): Reasonable daily limit
- **500**: For clearing backlog
- **50**: Light review days

#### Interval Settings

**New Card Intervals:**
- Graduating interval (good rating): 1-10 days
- Easy interval: 3-21 days
- Minimum interval: 1 day

**Maximum Interval:**
- Cap longest intervals (365 days default)
- Prevents cards from being scheduled too far out

### Review Settings

#### Session Limits

**Time Limits:**
- Max session duration (minutes)
- Break intervals
- Auto-end after limit

**Card Limits:**
- Max cards per session
- Separate limit for new cards
- Again card limit

#### Rating Options

**Rating Shortcuts:**
- Customize keyboard shortcuts
- Set default rating (Space key)
- Enable/disable rating shortcuts

**Auto-Advance:**
- Auto-move to next card after rating
- Delay before auto-advance (seconds)

### General Settings

#### Auto-Save
- Save interval (seconds)
- Save on card rating
- Save on tab switch

#### Recent Documents
- Max recent items (5-50)
- Clear recent documents

#### Default Category
- Set category for new items
- Can be overridden per item

#### Statistics
- Track review time
- Track card counts
- Update interval (real-time vs. periodic)

### Sync Settings

#### Browser Sync
- Enable/disable browser extension sync
- Sync interval (minutes)
- Conflict resolution (local wins / remote wins / ask)

#### Cloud Sync

**Supported Providers:**
- Dropbox
- Google Drive
- OneDrive

**Sync Options:**
- Auto-sync on changes
- Sync interval (manual, 15min, 30min, 1hr)
- Sync on app start/close
- Conflict handling

#### Backup

**Automatic Backups:**
- Backup frequency (daily, weekly)
- Max backups to keep (5-50)
- Backup location

**Manual Backup:**
- Settings → Backup → Create Backup
- Choose location
- Includes all data and settings

**Restore:**
- Settings → Backup → Restore
- Select backup file
- Confirm restore (replaces current data)

### Keyboard Shortcuts

#### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+P` | Go to... (documents, queue, etc.) |
| `Ctrl+,` | Open settings |
| `Ctrl+D` | Go to dashboard |
| `Ctrl+Q` | Go to queue |
| `Ctrl+R` | Start review |
| `Ctrl+O` | Open document |
| `Ctrl+N` | New card/extract |

#### Customization

1. Settings → Keybindings
2. Select action to remap
3. Press new key combination
4. Save changes

**Reset to Defaults:** Click "Reset All" button

### Integration Settings

#### Anki Integration

**Setup:**
1. Settings → Integrations → Anki
2. Configure AnkiConnect URL (default: `http://localhost:8765`)
3. Test connection
4. Enable bidirectional sync

**Sync Options:**
- Sync to Anki on card creation
- Sync intervals from Anki
- Deck mapping (Incrementum category → Anki deck)
- Tag synchronization

#### Obsidian Integration

**Setup:**
1. Settings → Integrations → Obsidian
2. Set vault path
3. Configure template
4. Enable sync

**Sync Features:**
- Export cards to Obsidian notes
- Import notes as cards
- Daily note integration
- Bidirectional tag sync

#### MCP Servers

**Model Context Protocol (MCP) Servers:**

Connect up to 3 MCP servers for AI-powered features:

1. Settings → AI → MCP Servers
2. Add server URL
3. Configure authentication
4. Enable features:
   - Smart card generation
   - Content summarization
   - Q&A assistance
   - Auto-tagging

### AI Settings

#### QA Providers

Configure AI providers for card generation:

**Supported Providers:**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Local LLMs (Ollama, LM Studio)
- Custom API endpoints

**Per-Provider Settings:**
- API key
- Model name
- Temperature (creativity)
- Max tokens
- System prompt

#### Auto-Generation

**Card Generation:**
- Enable auto-generate from extracts
- Number of cards per extract
- Quality threshold
- Require manual approval

**Summarization:**
- Auto-summarize long extracts
- Summary length (short, medium, long)
- Include in card content

#### Context Window

**Token Limits:**
- Max tokens per request
- Context from related cards
- Document snippet length

---

## Advanced Features

### Knowledge Graph

Visualize connections between your knowledge:

**2D Graph View:**
- Nodes: Documents, extracts, cards
- Edges: Relationships (same category, tags, references)
- Force-directed layout
- Interactive navigation

**3D Knowledge Sphere:**
- Immersive 3D visualization
- Rotate, zoom, pan
- Color-coded by category
- Click nodes to view content

**Features:**
- Search and filter
- Highlight related items
- Export as image
- Identify knowledge gaps

### RSS Reader

Learn from your favorite feeds:

**Feed Management:**
1. Click **RSS** tab
2. Click **Add Feed**
3. Enter feed URL
4. Set update interval
5. Enable auto-import to queue

**Feed Features:**
- Auto-poll for new articles
- Import articles as documents
- Extract key points automatically
- Create cards from feeds

**Recommended Feeds:**
- News sites (BBC, CNN, etc.)
- Blogs in your field
- Research journals
- Tech news (Hacker News, Ars Technica)

### YouTube Integration

**Video Import:**
1. Copy YouTube URL
2. Import as document
3. Incrementum fetches:
   - Video metadata
   - Transcript (if available)
   - Chapter information
   - Comments (optional)

**Transcript Features:**
- Full transcript searchable
- Create extracts from transcript
- Sync transcript with video
- Create cards at timestamps

**SponsorBlock Integration:**
- Auto-skip sponsored segments
- Category filtering
- Contribute to SponsorBlock

**Progress Tracking:**
- Resume from last position
- Mark watched sections
- Watch history

### OCR (Optical Character Recognition)

Extract text from images:

**Supported Providers:**
- Google Cloud Vision
- AWS Textract
- Mistral OCR
- Mathpix (for math equations)
- GPT-4o
- Claude Vision
- Local OCR (Tesseract)

**Use Cases:**
- Screenshot capture
- Scanned documents
- Images with text
- Handwritten notes

**Setup:**
1. Settings → OCR
2. Choose provider
3. Configure API key
4. Select language(s)
5. Test with sample image

**Math OCR:**
- Specialized handling for equations
- LaTeX output
- Symbol recognition
- Best for: Scientific papers, textbooks

### Command Palette

Quick access to all commands:

**Open:** `Ctrl+K` (or `Cmd+K` on Mac)

**Features:**
- Fuzzy search
- Keyboard navigation
- Recently used commands
- Search by name or shortcut

**Common Commands:**
- "Import document"
- "Start review"
- "Create card"
- "Open settings"
- "Export data"

### Vimium Mode

Vim-style keyboard navigation for power users:

**Enable:** Settings → Keybindings → Enable Vimium

**Navigation:**
- `j` / `k`: Scroll down/up
- `h` / `l`: Scroll left/right
- `gg`: Go to top
- `G`: Go to bottom
- `/`: Search
- `n` / `N`: Next/previous search result

**Actions:**
- `f`: Link hints (clickable elements)
- `i`: Enter input mode
- `Escape`: Exit input mode

**Customization:**
- Remap keys
- Create custom commands
- Share keybinding configs

### Search & Filtering

Advanced search across all content:

**Full-Text Search:**
- Search card content, extracts, documents
- Boolean operators (AND, OR, NOT)
- Phrase search ("exact phrase")
- Wildcards (card*)

**Search Filters:**
- `category:programming`: Search in category
- `tag:urgent`: Search by tag
- `type:cloze`: Search by card type
- `due:today`: Search due cards
- `rating:again`: Search by rating

**Saved Searches:**
1. Perform search
2. Click "Save Search"
3. Name and save
4. Access from search dropdown

### Browser Extension

Connect Incrementum with web browsing:

**Features:**
- Highlight web pages
- Create extracts from articles
- Sync with desktop app
- Quick-add to queue
- Browser-based reviews

**Setup:**
1. Install extension (Chrome/Firefox)
2. Pair with desktop app
3. Grant permissions
4. Start using!

**Usage:**
- Select text on webpage
- Click extension icon
- Choose "Add to Incrementum"
- Syncs automatically

---

## Tips & Best Practices

### Card Creation

**DO:**
- Make cards specific (one fact per card)
- Use simple, clear language
- Include context in answers
- Add relevant examples
- Use cloze for relationships
- Keep questions concise

**DON'T:**
- Put multiple facts in one card
- Use vague wording
- Make questions too easy or too hard
- Copy large text blocks
- Use abbreviations without definition

**Example - Bad Card:**
```
Q: What is the function of the mitochondria and how does
it relate to ATP production in cellular respiration?
A: [Paragraph explanation]
```

**Example - Good Cards:**
```
Card 1:
Q: What is the primary function of mitochondria?
A: Produce ATP through cellular respiration

Card 2:
Q: What process does mitochondria use to produce ATP?
A: Cellular respiration (aerobic)

Card 3:
Q: What is the energy currency produced by mitochondria?
A: ATP (Adenosine Triphosphate)
```

### Study Routine

**Daily Schedule (20-30 min):**
1. **Morning**: Review due cards (15 min)
2. **Throughout day**: Create extracts from reading
3. **Evening**: Create cards from extracts (10-15 min)

**Weekly Schedule:**
- **Mon-Fri**: Regular reviews and card creation
- **Saturday**: Longer study sessions (1-2 hours)
- **Sunday**: Review analytics, adjust goals, organize

**Managing Large Volumes:**
- Set daily review limit (e.g., 50 cards)
- Prioritize by category (focus on one subject)
- Use smart queues to break down tasks
- Take breaks every 20-30 minutes

### Retention Optimization

**Improve Retention Rate:**
- Rate honestly (don't inflate ratings)
- Review consistently (daily is best)
- Get enough sleep (memory consolidates during sleep)
- Active recall (don't peek, think first)
- Spaced reviews (don't cram)

**Dealing with Forgetting:**
- Normal to forget 10-20% (depending on target retention)
- "Again" cards are learning opportunities
- If forgetting frequently (>30%), consider:
  - Lowering desired retention (85-90%)
  - Creating simpler cards
  - Adding more context
  - Reviewing more frequently

### Category Organization

**Best Practices:**
- Start broad, then subdivide
- Example: `Programming` → `Programming/Python` → `Programming/Python/Async`
- Use consistent naming
- Don't create too many (5-10 is manageable)
- Merge unused categories

**Example Category Structure:**
```
├── Programming
│   ├── Python
│   ├── Rust
│   └── Algorithms
├── Languages
│   ├── Spanish
│   └── Japanese
├── Science
│   ├── Physics
│   └── Biology
└── Professional
    ├── Project Management
    └── System Design
```

### Priority Management

**Priority Guidelines:**
- **100 (Critical)**: Exam prep, urgent work projects
- **80-90 (High)**: Current courses, active learning
- **60-70 (Medium)**: Ongoing interests, general knowledge
- **40-50 (Low)**: Nice-to-know, supplementary
- **0-20 (Archive)**: Reference only, rarely review

**Priority Scheduling:**
- Focus on 80+ priority for daily reviews
- Review 60-70 every few days
- Review 40-50 weekly
- Review 0-20 monthly or on-demand

### Using Preview Intervals

The **Preview Interval** feature shows you exactly when each card will appear next for all four ratings.

**How to Use:**
1. Read the card
2. Check the preview intervals below rating buttons
3. Choose rating based on:
   - Your current recall
   - How soon you want to see it again
   - Your schedule (e.g., exam coming up)

**Example Strategy:**
- Exam in 2 weeks: Rate "Easy" on important cards to see them again soon
- Busy day: Rate "Good" or "Easy" to space out reviews
- Want to master: Rate "Hard" to review more frequently

### Managing Overwhelm

**Too Many Cards Due?**
1. Set review limit (Settings → Review → Max Per Day)
2. Focus on high-priority items
3. Suspend low-priority categories temporarily
4. Consider lowering desired retention slightly

**Too Much Content to Process?**
1. Import documents gradually
2. Extract key points only (not everything)
3. Create cards selectively
4. Use categories to organize

**Burnout?**
1. Take a break (it's okay!)
2. Reduce daily limits
3. Suspend non-critical categories
4. Focus on one category at a time

---

## Troubleshooting

### Common Issues

#### Cards not appearing in review

**Possible Causes:**
- All cards reviewed for today
- Cards suspended
- Filter active hiding cards

**Solutions:**
1. Check "Due" count in Review tab
2. Review Queue → Ensure cards are unsuspended
3. Clear filters
4. Check review date (maybe cards scheduled for future)

#### Poor retention rate

**Symptoms:** Forgetting many cards, frequent "Again" ratings

**Solutions:**
1. **Review Card Quality**: Are cards clear? One fact per card?
2. **Lower Desired Retention**: Try 85% instead of 90%
3. **Review More Frequently**: Daily reviews, not cramming
4. **Add Context**: More information in answers
5. **Simplify Cards**: Break complex cards into simpler ones

#### Sync conflicts

**Symptoms:** Duplicate cards, data mismatches after sync

**Solutions:**
1. Choose conflict resolution strategy (Settings → Sync)
   - **Local Wins**: Keep your changes
   - **Remote Wins**: Accept server changes
   - **Ask**: Manually resolve each conflict
2. Sync regularly to minimize conflicts
3. Use one primary device

#### Import failures

**Symptoms:** Document import fails or errors

**Solutions:**
1. **Check File Format**: Ensure supported format (PDF, EPUB, etc.)
2. **Check File Size**: Very large files may timeout
3. **Check URL**: Some sites block automated access
4. **Check Internet**: URL import requires connection
5. **Try Alternative**: Use copy-paste for web content

#### Performance issues

**Symptoms:** Slow loading, lag, freezes

**Solutions:**
1. **Large Database**: Archive old cards (Settings → Data → Archive)
2. **Many Images**: Images slow down loading
3. **System Resources**: Close other apps
4. **Rebuild Database**: Settings → Data → Rebuild (last resort)

#### OCR not working

**Symptoms:** OCR fails or produces poor results

**Solutions:**
1. **Check API Key**: Valid and has credits
2. **Check Image Quality**: Clear, high-resolution images work best
3. **Check Language**: Correct language selected
4. **Try Alternative Provider**: Some work better for certain content
5. **Local OCR**: Use Tesseract if internet issues

### Getting Help

**Resources:**
- **Documentation**: Check `docs/` folder for detailed guides
- **GitHub Issues**: Report bugs and feature requests
- **Community**: Join discussions, ask questions
- **Keyboard Shortcuts**: Press `?` in app for quick reference

**Debug Mode:**
Enable debug logging (Settings → Advanced → Debug Mode) to troubleshoot issues.

**Data Export:**
Export your data before major changes (Settings → Backup → Export)

### Recovery

**Accidental Deletion:**
1. Check backups (Settings → Backup)
2. Restore from recent backup
3. Contact support if no backup available

**Corrupted Database:**
1. Export data immediately
2. Rebuild database (Settings → Data → Rebuild)
3. Import exported data
4. Verify all data present

**Lost Progress:**
1. Check Analytics → Export for historical data
2. Restore from backup if needed
3. Sync with cloud provider if enabled

---

## Glossary

**Extract**: A piece of content extracted from a document, potential card material

**Learning Item**: Any item to be learned (flashcard, cloze, Q&A, etc.)

**Queue**: All items scheduled for review, organized by priority

**Review Session**: A period of actively recalling and rating cards

**FSRS**: Free Spaced Repetition Scheduler, modern algorithm optimizing review timing

**Interval**: Time between reviews (e.g., 7 days)

**Stability**: How long a memory lasts (FSRS metric)

**Difficulty**: How hard an item is for you, 1-10 scale (FSRS metric)

**Retrievability**: Current probability of recall, 0-100% (FSRS metric)

**Desired Retention**: Target retention rate (typically 90%)

**Preview Interval**: Feature showing next review date for each rating option

**Cloze**: Fill-in-the-blank card type

**Suspend**: Temporarily hide item from reviews

**Category**: Subject area for organization

**Tag**: Custom label for cross-category organization

**Priority**: User-set importance (0-100)

---

## Keyboard Shortcut Reference

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + P` | Quick navigation |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + D` | Go to dashboard |
| `Ctrl/Cmd + Q` | Go to queue |
| `Ctrl/Cmd + R` | Start review |
| `Ctrl/Cmd + O` | Open document |
| `Ctrl/Cmd + N` | New item |
| `Ctrl/Cmd + /` | Show keyboard shortcuts |
| `Ctrl/Cmd + ,` | Settings |

### Review Mode Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Show answer |
| `1` | Rate "Again" |
| `2` | Rate "Hard" |
| `3` | Rate "Good" |
| `4` | Rate "Easy" |
| `Ctrl/Cmd + Enter` | Show answer (alternative) |
| `Ctrl/Cmd + 1/2/3/4` | Rate without showing answer |
| `Esc` | End session |
| `Ctrl/Cmd + E` | Edit current card |
| `Ctrl/Cmd + D` | Delete current card |
| `Ctrl/Cmd + S` | Suspend card |
| `Ctrl/Cmd + H` | Card history |

### Queue Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Focus search |
| `Ctrl/Cmd + A` | Select all |
| `Delete` | Delete selected |
| `Ctrl/Cmd + Click` | Multi-select |
| `Shift + Click` | Range select |

### Document Viewer Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Search in document |
| `Ctrl/Cmd + C` | Copy selected text |
| `Ctrl/Cmd + E` | Create extract from selection |
| `Ctrl/Cmd + H` | Highlight selection |
| `Ctrl/Cmd + +` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom |
| `F11` | Full screen |

---

## FAQ

**Q: How many cards should I review per day?**
A: Start with 20-50 per day. Adjust based on your schedule and goals. Consistency is more important than volume.

**Q: How many cards can I create per day?**
A: As many as you want, but focus on quality over quantity. 10-20 well-made cards are better than 50 poor ones.

**Q: What retention rate should I target?**
A: 90% is the recommended default. Adjust to 85% if you have too many reviews, or 95% for critical material.

**Q: Can I use Incrementum for languages?**
A: Absolutely! It's excellent for vocabulary, grammar, and sentence cards. Use cloze cards for grammar patterns.

**Q: How do I handle math equations?**
A: Use LaTeX syntax in cards. For OCR, use Mathpix provider for best results with math content.

**Q: Can I sync with Anki?**
A: Yes! Configure AnkiConnect in Settings → Integrations → Anki for bidirectional sync.

**Q: What's the difference between suspending and deleting?**
A: Suspending hides cards temporarily (can be unsuspended). Deleting removes permanently (can be restored from backup).

**Q: How often should I review?**
A: Daily is ideal. If you miss days, cards will accumulate but won't be "lost" - just catch up when you can.

**Q: Can I use Incrementum on multiple devices?**
A: Not directly yet, but you can sync data via Dropbox/Google Drive, or use the browser extension.

**Q: Is my data private?**
A: Yes! All data stored locally. Cloud sync is encrypted. No data sent to servers except configured AI providers.

**Q: How do I export my cards?**
A: Settings → Backup → Export, or use Anki sync to export to .apkg format.

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history and updates.

---

## Support & Community

- **Documentation**: [docs/](./)
- **GitHub**: [incrementum-tauri](https://github.com/melpomenex/incrementum-tauri)
- **Issues**: [Report bugs](https://github.com/melpomenex/incrementum-tauri/issues)
- **Discussions**: [Ask questions](https://github.com/melpomenex/incrementum-tauri/discussions)

---

**Happy Learning! 🚀**

Built with ❤️ using Tauri + React + Rust
