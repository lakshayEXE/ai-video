import Parser from 'rss-parser';

const parser = new Parser();

// 5 High-Signal Verticals for Research Ingestion
const RSS_VERTICALS = {
  ai_tech: [
    'https://news.google.com/rss/search?q=artificial+intelligence+breakthrough&hl=en-US&gl=US&ceid=US:en',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
  ],
  startups_saas: [
    'https://techcrunch.com/category/startups/feed/',
    'https://news.ycombinator.com/rss',
    'https://news.google.com/rss/search?q=saas+startup+funding+growth&hl=en-US&gl=US&ceid=US:en'
  ],
  business_wealth: [
    'https://wired.com/feed/category/business/latest/rss',
    'https://news.google.com/rss/search?q=digital+business+strategy+market&hl=en-US&gl=US&ceid=US:en',
    'https://www.cnbc.com/id/19854910/device/rss/rss.html'
  ],
  productivity_tech: [
    'https://news.google.com/rss/search?q=productivity+software+tools+tech&hl=en-US&gl=US&ceid=US:en',
    'https://lifehacker.com/rss'
  ]
};

// Curated Evergreen Masterclass Topics Pool (Fallback & Deep Concepts)
const EVERGREEN_CONCEPT_POOL = [
  { title: "How 7-Figure Solopreneurs Build Automated AI Workflows", category: "SOLOPRENEUR PLAYBOOK" },
  { title: "The 80/20 Rule of SaaS Monetization & Pricing Strategy", category: "BUSINESS FRAMEWORK" },
  { title: "Understanding RAG (Retrieval-Augmented Generation) in 5 Simple Steps", category: "TECH BREAKDOWN" },
  { title: "How Micro-SaaS Founders Reach $10k/Month with Zero Employees", category: "CASE STUDY" },
  { title: "The Psychology of Viral Instagram Hooks & High-Retention Content", category: "CREATOR ECONOMY" },
  { title: "Vector Databases Explained: Why Traditional Search is Obsolete", category: "FUTURE TECH" },
  { title: "5 Essential AI Tools Every High-Performance Founder Uses in 2026", category: "PRODUCTIVITY STACK" },
  { title: "The Zero-To-One Framework: Building Products That People Love", category: "STARTUP STRATEGY" }
];

// Boring B2B / corporate terms to filter out for high audience retention
const BORING_KEYWORDS = [
  'raises $', 'raised $', 'series a', 'series b', 'series c', 'seed round',
  'quarterly earnings', 'q1 ', 'q2 ', 'q3 ', 'q4 ', 'appoints ', 'named ceo',
  'b2b ', 'logistics ', 'compliance ', 'supply chain'
];

/**
 * Fetches a fresh top topic from RSS feeds or evergreen concept pool.
 * @param {string} [requestedMode='mixed'] - Mode: 'rss', 'evergreen', or 'mixed'
 * @returns {Promise<{title: string, snippet: string, link: string, category: string, isEvergreen: boolean}>}
 */
export async function getLatestNewsTopic(requestedMode = 'mixed') {
  // If evergreen mode or random coin toss in mixed mode (40% chance for viral high-value concept masterclass)
  const useEvergreen = requestedMode === 'evergreen' || (requestedMode === 'mixed' && Math.random() < 0.40);

  if (useEvergreen) {
    const concept = EVERGREEN_CONCEPT_POOL[Math.floor(Math.random() * EVERGREEN_CONCEPT_POOL.length)];
    return {
      title: concept.title,
      snippet: `Deep educational breakdown on ${concept.title}. Practical frameworks, key statistics, and actionable step-by-step strategies for high-performance builders.`,
      link: 'https://hustlermaxing.com/masterclass',
      category: concept.category,
      isEvergreen: true
    };
  }

  // Pick random vertical
  const verticals = Object.keys(RSS_VERTICALS);
  const selectedVerticalKey = verticals[Math.floor(Math.random() * verticals.length)];
  const feedUrls = RSS_VERTICALS[selectedVerticalKey];
  const randomFeedUrl = feedUrls[Math.floor(Math.random() * feedUrls.length)];

  try {
    const feed = await parser.parseURL(randomFeedUrl);

    if (!feed.items || feed.items.length === 0) {
      throw new Error('No items in feed');
    }

    // Filter out seen titles AND boring B2B funding headlines
    let candidateItems = feed.items.filter(item => {
      if (!item.title) return false;
      if (seenNewsTitles.has(item.title)) return false;
      const lower = item.title.toLowerCase();
      return !BORING_KEYWORDS.some(word => lower.includes(word));
    });

    if (candidateItems.length === 0) {
      candidateItems = feed.items.filter(item => item.title && !seenNewsTitles.has(item.title));
    }
    if (candidateItems.length === 0) {
      candidateItems = feed.items;
    }

    const topCandidates = candidateItems.slice(0, 5);
    const selectedItem = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    seenNewsTitles.add(selectedItem.title);
    if (seenNewsTitles.size > 100) {
      const firstKey = seenNewsTitles.keys().next().value;
      seenNewsTitles.delete(firstKey);
    }

    const categoryMap = {
      ai_tech: 'AI BREAKTHROUGH',
      startups_saas: 'STARTUP CASE STUDY',
      business_wealth: 'MARKET STRATEGY',
      productivity_tech: 'PRODUCTIVITY STACK'
    };

    return {
      title: selectedItem.title,
      snippet: selectedItem.contentSnippet || selectedItem.content || selectedItem.title,
      link: selectedItem.link || 'https://news.google.com',
      category: categoryMap[selectedVerticalKey] || 'TECH INSIGHT',
      isEvergreen: false
    };

  } catch (error) {
    console.warn(`⚠️ RSS fetch failed (${randomFeedUrl}), falling back to Evergreen Concept Pool:`, error.message);
    const concept = EVERGREEN_CONCEPT_POOL[Math.floor(Math.random() * EVERGREEN_CONCEPT_POOL.length)];
    return {
      title: concept.title,
      snippet: `Educational breakdown on ${concept.title}`,
      link: 'https://hustlermaxing.com',
      category: concept.category,
      isEvergreen: true
    };
  }
}


