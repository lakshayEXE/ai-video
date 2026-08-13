import Parser from 'rss-parser';

const parser = new Parser();

// High-Signal & High-Virality Verticals for Trending Ingestion
const RSS_VERTICALS = {
  ai_trending: [
    'https://news.google.com/rss/search?q=OpenAI+OR+ChatGPT+OR+Sam+Altman&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=Claude+AI+OR+Anthropic+OR+Gemini+AI&hl=en-US&gl=US&ceid=US:en',
    'https://hnrss.org/newest?q=AI+OR+LLM+OR+OpenAI+OR+Claude+OR+DeepSeek',
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
    'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
  ],
  ai_agents_creators: [
    'https://news.google.com/rss/search?q=AI+agents+OR+autonomous+AI+OR+Cursor+AI+OR+DeepSeek&hl=en-US&gl=US&ceid=US:en',
    'https://hnrss.org/newest?q=agentic+OR+autonomous+agent+OR+coding+assistant',
    'https://venturebeat.com/feed/'
  ],
  viral_tech: [
    'https://news.google.com/rss/search?q=Elon+Musk+AI+OR+Nvidia+AI+breakthrough&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=AI+automation+future+of+jobs&hl=en-US&gl=US&ceid=US:en',
    'https://wired.com/feed/category/business/latest/rss'
  ],
  productivity_wealth: [
    'https://news.google.com/rss/search?q=best+AI+tools+productivity+solopreneur&hl=en-US&gl=US&ceid=US:en',
    'https://lifehacker.com/rss'
  ]
};

// Curated Evergreen Masterclass Topics Pool (Fallback & Creator Sphere Deep Concepts)
const EVERGREEN_CONCEPT_POOL = [
  { title: "The Agentic Shift: Why AI Chatbots are Dead and Autonomous Agents Are Winning", category: "AI AGENTS" },
  { title: "DeepSeek vs Claude Opus vs GPT: The Multi-Model Routing Framework for 2026", category: "BENCHMARK WAR" },
  { title: "How 7-Figure Solopreneurs Build Automated AI Workflows", category: "SOLOPRENEUR PLAYBOOK" },
  { title: "The 80/20 Rule of SaaS Monetization & Pricing Strategy", category: "BUSINESS FRAMEWORK" },
  { title: "Understanding RAG (Retrieval-Augmented Generation) in 5 Simple Steps", category: "TECH BREAKDOWN" },
  { title: "How Micro-SaaS Founders Reach $10k/Month with Zero Employees Using AI Agents", category: "CASE STUDY" },
  { title: "The Psychology of Viral Instagram Hooks & High-Retention AI Content", category: "CREATOR ECONOMY" },
  { title: "Vector Databases & Semantic Search: Why Keyword Search is Obsolete", category: "FUTURE TECH" },
  { title: "5 Essential AI Developer Tools Every High-Performance Founder Uses", category: "PRODUCTIVITY STACK" },
  { title: "The Zero-To-One Framework: Building Autonomous Products That Scale", category: "STARTUP STRATEGY" }
];

const seenNewsTitles = new Set();

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
      ai_trending: 'AI BREAKTHROUGH',
      ai_agents_creators: 'AUTONOMOUS AGENTS',
      viral_tech: 'TRENDING TECH',
      productivity_wealth: 'PRODUCTIVITY & WEALTH'
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


