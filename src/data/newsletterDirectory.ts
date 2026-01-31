/**
 * Curated directory of popular newsletter RSS feeds
 * Organized by category for easy browsing and subscription
 */

export interface NewsletterSource {
  id: string;
  title: string;
  description: string;
  author: string;
  feedUrl: string;
  webUrl: string;
  category: NewsletterCategory;
  platform: "substack" | "beehiiv" | "ghost" | "medium" | "wordpress" | "custom";
  imageUrl?: string;
}

export type NewsletterCategory =
  | "technology"
  | "science"
  | "finance"
  | "business"
  | "health"
  | "lifestyle"
  | "politics"
  | "arts"
  | "education"
  | "crypto";

export interface NewsletterCategoryInfo {
  id: NewsletterCategory;
  name: string;
  description: string;
  icon: string;
}

export const newsletterCategories: NewsletterCategoryInfo[] = [
  { id: "technology", name: "Technology", description: "Tech news, AI, programming, and digital culture", icon: "laptop" },
  { id: "science", name: "Science", description: "Research, discoveries, and scientific insights", icon: "microscope" },
  { id: "finance", name: "Finance", description: "Investing, markets, and personal finance", icon: "trending-up" },
  { id: "business", name: "Business", description: "Entrepreneurship, strategy, and company building", icon: "briefcase" },
  { id: "health", name: "Health", description: "Wellness, medicine, and healthy living", icon: "heart" },
  { id: "lifestyle", name: "Lifestyle", description: "Culture, travel, food, and personal development", icon: "coffee" },
  { id: "politics", name: "Politics", description: "Policy, governance, and current events", icon: "landmark" },
  { id: "arts", name: "Arts & Literature", description: "Books, art, music, and creative writing", icon: "palette" },
  { id: "education", name: "Education", description: "Learning, teaching, and academic insights", icon: "graduation-cap" },
  { id: "crypto", name: "Crypto & Web3", description: "Blockchain, DeFi, and cryptocurrency news", icon: "coins" },
];

/**
 * Curated list of popular newsletters with RSS feeds
 */
export const newsletterDirectory: NewsletterSource[] = [
  // TECHNOLOGY
  {
    id: "tech-ben-evans",
    title: "Benedict Evans",
    description: "Weekly analysis of tech, media, and the macro strategic context. Essential reading for understanding what's happening in tech.",
    author: "Benedict Evans",
    feedUrl: "https://ben-evans.com/benedictevans/rss",
    webUrl: "https://ben-evans.com/",
    category: "technology",
    platform: "custom",
  },
  {
    id: "tech-stratechery",
    title: "Stratechery",
    description: "Analysis of the strategy and business side of technology and media, and the impact of technology on society.",
    author: "Ben Thompson",
    feedUrl: "https://stratechery.com/feed/",
    webUrl: "https://stratechery.com/",
    category: "technology",
    platform: "custom",
  },
  {
    id: "tech-hacker-news",
    title: "Hacker News (Y Combinator)",
    description: "Front page of the internet for developers and entrepreneurs. Community-curated tech news.",
    author: "Y Combinator",
    feedUrl: "https://news.ycombinator.com/rss",
    webUrl: "https://news.ycombinator.com/",
    category: "technology",
    platform: "custom",
  },
  {
    id: "tech-protocol",
    title: "Protocol",
    description: "Tech policy and the power players shaping Silicon Valley and Washington.",
    author: "Protocol",
    feedUrl: "https://www.protocol.com/rss.xml",
    webUrl: "https://www.protocol.com/",
    category: "technology",
    platform: "custom",
  },
  {
    id: "tech-the-pragmatic-engineer",
    title: "The Pragmatic Engineer",
    description: "Software engineering insights from Big Tech and startups. Engineering practices, career advice, and industry analysis.",
    author: "Gergely Orosz",
    feedUrl: "https://blog.pragmaticengineer.com/feed/",
    webUrl: "https://blog.pragmaticengineer.com/",
    category: "technology",
    platform: "custom",
  },

  // SCIENCE
  {
    id: "sci-quanta",
    title: "Quanta Magazine",
    description: "Award-winning coverage of developments in mathematics, theoretical physics, theoretical computer science and the basic life sciences.",
    author: "Quanta Magazine",
    feedUrl: "https://www.quantamagazine.org/feed/",
    webUrl: "https://www.quantamagazine.org/",
    category: "science",
    platform: "custom",
  },
  {
    id: "sci-scientific-american",
    title: "Scientific American",
    description: "Latest science news, articles, and discoveries. Authority in science journalism.",
    author: "Scientific American",
    feedUrl: "https://www.scientificamerican.com/rss.jsp",
    webUrl: "https://www.scientificamerican.com/",
    category: "science",
    platform: "custom",
  },
  {
    id: "sci-mit-tech-review",
    title: "MIT Technology Review",
    description: "Authoritative journalism on the future of technology, with insights on AI, biotech, computing, and more.",
    author: "MIT",
    feedUrl: "https://www.technologyreview.com/feed/",
    webUrl: "https://www.technologyreview.com/",
    category: "science",
    platform: "custom",
  },
  {
    id: "sci-the-algorithm",
    title: "MIT News The Algorithm",
    description: "Artificial intelligence news and research from MIT.",
    author: "MIT",
    feedUrl: "https://news.mit.edu/topic/artificial-intelligence2/feed",
    webUrl: "https://news.mit.edu/",
    category: "science",
    platform: "custom",
  },

  // FINANCE
  {
    id: "fin-morning-brew",
    title: "Morning Brew",
    description: "Daily digest of business news and stories, delivered in a fun and informative format.",
    author: "Morning Brew",
    feedUrl: "https://www.morningbrew.com/rss",
    webUrl: "https://www.morningbrew.com/",
    category: "finance",
    platform: "custom",
  },
  {
    id: "fin-axios-markets",
    title: "Axios Markets",
    description: "Business and market news with concise, smart coverage of the latest financial developments.",
    author: "Axios",
    feedUrl: "https://www.axios.com/newsletters/axios-markets.rss",
    webUrl: "https://www.axios.com/newsletters/axios-markets",
    category: "finance",
    platform: "custom",
  },
  {
    id: "fin-a-wealth-of-common-sense",
    title: "A Wealth of Common Sense",
    description: "Rational perspectives on finance, investing, and the economy. Cutting through market noise.",
    author: "Ben Carlson",
    feedUrl: "https://awealthofcommonsense.com/feed/",
    webUrl: "https://awealthofcommonsense.com/",
    category: "finance",
    platform: "custom",
  },
  {
    id: "fin-the-daily-wealth",
    title: "The Daily Wealth",
    description: "Investment insights and wealth-building strategies from Stansberry Research.",
    author: "Stansberry Research",
    feedUrl: "https://dailywealth.com/feed/",
    webUrl: "https://dailywealth.com/",
    category: "finance",
    platform: "custom",
  },

  // BUSINESS
  {
    id: "biz-the-ben-coleman-show",
    title: "The Ben Coleman Show",
    description: "Essays on tech, business, and the future of work from a startup founder.",
    author: "Ben Coleman",
    feedUrl: "https://bencoleman.substack.com/feed",
    webUrl: "https://bencoleman.substack.com/",
    category: "business",
    platform: "substack",
  },
  {
    id: "biz-lenny-rachitsky",
    title: "Lenny's Newsletter",
    description: "Product management insights, advice, and frameworks. Essential reading for PMs and product leaders.",
    author: "Lenny Rachitsky",
    feedUrl: "https://www.lennyrachitsky.com/feed",
    webUrl: "https://www.lennyrachitsky.com/",
    category: "business",
    platform: "substack",
  },
  {
    id: "biz-not-boring",
    title: "Not Boring",
    description: "Business strategy, finance, and tech essays that are actually fun to read.",
    author: "Packy McCormick",
    feedUrl: "https://www.notboring.substack.com/feed",
    webUrl: "https://www.notboring.substack.com/",
    category: "business",
    platform: "substack",
  },
  {
    id: "biz-both-sides-of-the-table",
    title: "Both Sides of the Table",
    description: "Perspectives from a VC and entrepreneur on startups, investing, and technology.",
    author: "Mark Suster",
    feedUrl: "https://bothsidesofthetable.com/feed/",
    webUrl: "https://bothsidesofthetable.com/",
    category: "business",
    platform: "custom",
  },
  {
    id: "biz-indie-hackers",
    title: "Indie Hackers",
    description: "Stories and strategies for building profitable online businesses and side projects.",
    author: "Indie Hackers",
    feedUrl: "https://www.indiehackers.com/feed",
    webUrl: "https://www.indiehackers.com/",
    category: "business",
    platform: "custom",
  },

  // HEALTH
  {
    id: "health-peter-attia",
    title: "Peter Attia Drive",
    description: "Deep dives into health, longevity, and performance medicine. Science-based approach to living longer.",
    author: "Peter Attia",
    feedUrl: "https://peterattiamd.com/feed/",
    webUrl: "https://peterattiamd.com/",
    category: "health",
    platform: "custom",
  },
  {
    id: "health-huberman-lab",
    title: "Huberman Lab",
    description: "Neuroscience and practical tools for health and performance from Stanford neuroscientist Andrew Huberman.",
    author: "Andrew Huberman",
    feedUrl: "https://hubermanlab.libsyn.com/rss",
    webUrl: "https://hubermanlab.com/",
    category: "health",
    platform: "custom",
  },
  {
    id: "health-examine",
    title: "Examine.com",
    description: "Evidence-based nutrition and supplement research. Unbiased analysis of health science.",
    author: "Examine.com",
    feedUrl: "https://examine.com/feed",
    webUrl: "https://examine.com/",
    category: "health",
    platform: "custom",
  },
  {
    id: "health-the-meditation-mindfulness",
    title: "Mindful",
    description: "Mindfulness, meditation, and mental well-being insights and practices.",
    author: "Mindful.org",
    feedUrl: "https://www.mindful.org/feed/",
    webUrl: "https://www.mindful.org/",
    category: "health",
    platform: "custom",
  },

  // LIFESTYLE
  {
    id: "life-james-clear",
    title: "James Clear",
    description: "Habits, decision-making, and continuous improvement. Author of Atomic Habits.",
    author: "James Clear",
    feedUrl: "https://jamesclear.com/feed",
    webUrl: "https://jamesclear.com/",
    category: "lifestyle",
    platform: "custom",
  },
  {
    id: "life-next-idea",
    title: "The Next Big Idea",
    description: "Book summaries and big ideas from the world's leading thinkers.",
    author: "The Next Big Idea Club",
    feedUrl: "https://nextbigideahosting.com/podcast/rss",
    webUrl: "https://nextbigideaclub.com/",
    category: "lifestyle",
    platform: "custom",
  },
  {
    id: "life-brain-pickings",
    title: "The Marginalian (formerly Brain Pickings)",
    description: "Library of humanity's search for meaning. Essays on creativity, philosophy, and culture.",
    author: "Maria Popova",
    feedUrl: "https://www.themarginalian.org/feed",
    webUrl: "https://www.themarginalian.org/",
    category: "arts",
    platform: "custom",
  },
  {
    id: "life-darius-foroux",
    title: "Darius Foroux",
    description: "Productivity, habits, and personal development. Practical advice for a better life.",
    author: "Darius Foroux",
    feedUrl: "https://dariusforoux.com/feed",
    webUrl: "https://dariusforoux.com/",
    category: "lifestyle",
    platform: "custom",
  },

  // POLITICS
  {
    id: "pol-the-newsletter",
    title: "The Newsletter (Matt Taibbi)",
    description: "Independent journalism and commentary on politics, media, and culture.",
    author: "Matt Taibbi",
    feedUrl: "https://taibbi.substack.com/feed",
    webUrl: "https://taibbi.substack.com/",
    category: "politics",
    platform: "substack",
  },
  {
    id: "pol-the-bulwark",
    title: "The Bulwark",
    description: "Conservative commentary and analysis defending democratic norms and institutions.",
    author: "The Bulwark",
    feedUrl: "https://thebulwark.com/feed/",
    webUrl: "https://thebulwark.com/",
    category: "politics",
    platform: "custom",
  },
  {
    id: "pol-the-atlantic",
    title: "The Atlantic",
    description: "In-depth journalism, essays, and ideas on politics, culture, and more.",
    author: "The Atlantic",
    feedUrl: "https://www.theatlantic.com/feed/all/",
    webUrl: "https://www.theatlantic.com/",
    category: "politics",
    platform: "custom",
  },
  {
    id: "pol-politico",
    title: "Politico",
    description: "Politics and policy news from Washington and beyond.",
    author: "Politico",
    feedUrl: "https://www.politico.com/rss/politics.xml",
    webUrl: "https://www.politico.com/",
    category: "politics",
    platform: "custom",
  },

  // ARTS & LITERATURE
  {
    id: "arts-the-new-yorker",
    title: "The New Yorker",
    description: "Award-winning reporting, fiction, poetry, and commentary on culture and politics.",
    author: "The New Yorker",
    feedUrl: "https://www.newyorker.com/feed/rss",
    webUrl: "https://www.newyorker.com/",
    category: "arts",
    platform: "custom",
  },
  {
    id: "arts-the-baffles",
    title: "The Baffler",
    description: "Cultural and political criticism with a sharp wit and independent perspective.",
    author: "The Baffler",
    feedUrl: "https://www.thebaffler.com/rss",
    webUrl: "https://www.thebaffler.com/",
    category: "arts",
    platform: "custom",
  },
  {
    id: "arts-electric-literature",
    title: "Electric Literature",
    description: "Literary news, essays, and book recommendations for the modern reader.",
    author: "Electric Literature",
    feedUrl: "https://electricliterature.com/feed/",
    webUrl: "https://electricliterature.com/",
    category: "arts",
    platform: "custom",
  },
  {
    id: "arts-the-editing-podcast",
    title: "The Editing Podcast",
    description: "Insights into the craft of editing and publishing for writers and editors.",
    author: "Louise Harnby and Denise Cowle",
    feedUrl: "https://theeditingpodcast.libsyn.com/rss",
    webUrl: "https://theeditingpodcast.com/",
    category: "arts",
    platform: "custom",
  },

  // EDUCATION
  {
    id: "edu-edutopia",
    title: "Edutopia",
    description: "Evidence-based teaching strategies and innovative education practices.",
    author: "George Lucas Educational Foundation",
    feedUrl: "https://www.edutopia.org/rss",
    webUrl: "https://www.edutopia.org/",
    category: "education",
    platform: "custom",
  },
  {
    id: "edu-the-chronicle-of-higher-education",
    title: "The Chronicle of Higher Education",
    description: "News and analysis for college and university faculty and administrators.",
    author: "The Chronicle",
    feedUrl: "https://www.chronicle.com/rss",
    webUrl: "https://www.chronicle.com/",
    category: "education",
    platform: "custom",
  },
  {
    id: "edu-teach-thought",
    title: "TeachThought",
    description: "Innovative teaching ideas, learning strategies, and educational technology.",
    author: "Terry Heick",
    feedUrl: "https://www.teachthought.com/feed/",
    webUrl: "https://www.teachthought.com/",
    category: "education",
    platform: "custom",
  },
  {
    id: "edu-scott-h-young",
    title: "Scott H Young",
    description: "Learning strategies, productivity, and career development insights.",
    author: "Scott Young",
    feedUrl: "https://www.scotthyoung.com/feed/",
    webUrl: "https://www.scotthyoung.com/",
    category: "education",
    platform: "custom",
  },

  // CRYPTO & WEB3
  {
    id: "crypto-bankless",
    title: "Bankless",
    description: "Daily newsletter on DeFi, Ethereum, and the future of finance without banks.",
    author: "Bankless",
    feedUrl: "https://newsletter.banklesshq.com/feed",
    webUrl: "https://www.banklesshq.com/",
    category: "crypto",
    platform: "custom",
  },
  {
    id: "crypto-the-dellanna-crypto",
    title: "The CoinFund",
    description: "Analysis of crypto markets, DeFi protocols, and blockchain technology.",
    author: "CoinFund",
    feedUrl: "https://coinfund.io/feed/",
    webUrl: "https://coinfund.io/",
    category: "crypto",
    platform: "custom",
  },
  {
    id: "crypto-the-defi-educator",
    title: "The DeFi Educator",
    description: "Educational content on decentralized finance, smart contracts, and Web3.",
    author: "The DeFi Educator",
    feedUrl: "https://thedefieducator.substack.com/feed",
    webUrl: "https://thedefieducator.substack.com/",
    category: "crypto",
    platform: "substack",
  },
  {
    id: "crypto-wallet-connect",
    title: "WalletConnect",
    description: "Updates on Web3 wallet technology, decentralized apps, and blockchain interoperability.",
    author: "WalletConnect",
    feedUrl: "https://blog.walletconnect.com/feed",
    webUrl: "https://blog.walletconnect.com/",
    category: "crypto",
    platform: "custom",
  },
];

/**
 * Get newsletters by category
 */
export function getNewslettersByCategory(category: NewsletterCategory): NewsletterSource[] {
  return newsletterDirectory.filter((n) => n.category === category);
}

/**
 * Search newsletters by query (title, description, author)
 */
export function searchNewsletters(query: string): NewsletterSource[] {
  const lowerQuery = query.toLowerCase();
  return newsletterDirectory.filter(
    (n) =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.description.toLowerCase().includes(lowerQuery) ||
      n.author.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get newsletter by ID
 */
export function getNewsletterById(id: string): NewsletterSource | undefined {
  return newsletterDirectory.find((n) => n.id === id);
}

/**
 * Get all platforms represented in the directory
 */
export function getNewsletterPlatforms(): string[] {
  const platforms = new Set(newsletterDirectory.map((n) => n.platform));
  return Array.from(platforms).sort();
}
