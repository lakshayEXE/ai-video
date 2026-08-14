import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

const parser = new Parser();

const HISTORY_FILE = path.resolve('./assets/published_topics.json');

// Helper to load published topic history from disk
function getPublishedHistory() {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
    return new Set(JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8')));
  } catch (e) {
    return new Set();
  }
}

// Helper to record new published topic to disk
export function markTopicAsPublished(title) {
  try {
    const history = getPublishedHistory();
    history.add(title);
    // Keep last 300 topics
    const historyArr = Array.from(history).slice(-300);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyArr, null, 2));
    console.log(`📌 Topic saved to history database: "${title}"`);
  } catch (e) {
    console.warn('⚠️ Error updating published_topics.json:', e.message);
  }
}

// High-Signal & High-Virality Verticals for Trending Ingestion
const RSS_VERTICALS = {
  ai_research_papers: [
    'https://rss.arxiv.org/rss/cs.AI',
    'https://news.google.com/rss/search?q=AI+paper+OR+arXiv+AI+breakthrough+OR+HuggingFace+trending+paper&hl=en-US&gl=US&ceid=US:en',
    'https://hnrss.org/newest?q=paper+OR+arXiv+OR+benchmark+OR+reasoning+model+OR+DeepSeek'
  ],
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

// Curated Masterclass Concept Pool (Expanded 25+ High-Signal AI & Tech Concepts)
const EVERGREEN_CONCEPT_POOL = [
  { title: "The Agentic Shift: Why AI Chatbots are Dead and Autonomous Agents Are Winning", category: "AI AGENTS" },
  { title: "DeepSeek R1 vs Claude 3.7 Sonnet: The Open-Weights Reasoning War", category: "BENCHMARK WAR" },
  { title: "How 7-Figure Solopreneurs Build Automated AI Code & Video Engines", category: "SOLOPRENEUR PLAYBOOK" },
  { title: "The 80/20 Rule of SaaS Monetization & Automated AI Pricing", category: "BUSINESS FRAMEWORK" },
  { title: "Understanding RAG & Vector Search: Grounding AI to End Hallucinations", category: "TECH BREAKDOWN" },
  { title: "How Micro-SaaS Founders Reach $10k/Month with Zero Employees Using AI Agents", category: "CASE STUDY" },
  { title: "The Psychology of Viral AI Hooks & High-Retention Video Content", category: "CREATOR ECONOMY" },
  { title: "Cursor AI & Claude Engineer: How 1 Developer Replaced a 5-Person Tech Team", category: "FUTURE TECH" },
  { title: "5 Essential AI Developer Tools Every High-Performance Founder Uses in 2026", category: "PRODUCTIVITY STACK" },
  { title: "The Zero-To-One Framework: Building Autonomous Products That Scale", category: "STARTUP STRATEGY" },
  { title: "Local LLMs vs Cloud APIs: Running DeepSeek R1 On Your Laptop For $0", category: "HARDWARE & LOCAL AI" },
  { title: "AI Prompt Engineering is Dead: Context Injection & System Prompt Architecture", category: "AI ARCHITECTURE" },
  { title: "Why Multi-Agent Systems Outperform Single Large Language Models", category: "AGENTIC DESIGN" },
  { title: "How Autonomous AI Outbound Reps Are Disrupting Tech Sales", category: "SALES AUTOMATION" },
  { title: "Building Synthetic Datasets to Fine-Tune Open Source LLMs", category: "MODEL TRAINING" },
  { title: "The Rise of AI Video Generators: Sora, Runway Gen-3 & Kling AI Demystified", category: "AI MEDIA" },
  { title: "How High-Velocity Tech Startups Use Automated CI/CD Pipelines to Ship Daily", category: "DEVOPS & SCALE" },
  { title: "AI Memory & Context Windows: How 2M Token Windows Change Software", category: "AI ENGINEERING" }
];

// Boring B2B / corporate terms to filter out
const BORING_KEYWORDS = [
  'raises $', 'raised $', 'series a', 'series b', 'series c', 'seed round',
  'quarterly earnings', 'q1 ', 'q2 ', 'q3 ', 'q4 ', 'appoints ', 'named ceo',
  'b2b ', 'logistics ', 'compliance ', 'supply chain'
];

/**
 * Fetches a fresh, unseen top topic from RSS feeds or evergreen concept pool.
 * @param {string} [requestedMode='mixed'] - Mode: 'rss', 'evergreen', or 'mixed'
 * @returns {Promise<{title: string, snippet: string, link: string, category: string, isEvergreen: boolean}>}
 */
export async function getLatestNewsTopic(requestedMode = 'mixed') {
  const publishedHistory = getPublishedHistory();

  if (requestedMode === 'paper') {
    const feedUrls = RSS_VERTICALS.ai_research_papers;
    const randomFeedUrl = feedUrls[Math.floor(Math.random() * feedUrls.length)];
    try {
      const feed = await parser.parseURL(randomFeedUrl);
      if (feed.items && feed.items.length > 0) {
        let candidateItems = feed.items.filter(item => item.title && !publishedHistory.has(item.title));
        if (candidateItems.length === 0) candidateItems = feed.items;
        const selectedItem = candidateItems[Math.floor(Math.random() * Math.min(candidateItems.length, 8))];
        markTopicAsPublished(selectedItem.title);
        return {
          title: selectedItem.title,
          snippet: selectedItem.contentSnippet || selectedItem.content || selectedItem.title,
          link: selectedItem.link || 'https://arxiv.org',
          category: 'PAPER BREAKDOWN',
          isEvergreen: false
        };
      }
    } catch (e) {
      console.warn('⚠️ Paper RSS fetch error, using evergreen paper concept:', e.message);
    }
  }

  // Mode decision: 60% RSS, 40% Evergreen
  const useEvergreen = requestedMode === 'evergreen' || (requestedMode === 'mixed' && Math.random() < 0.40);

  if (useEvergreen) {
    const freshEvergreen = EVERGREEN_CONCEPT_POOL.filter(c => !publishedHistory.has(c.title));
    const poolToUse = freshEvergreen.length > 0 ? freshEvergreen : EVERGREEN_CONCEPT_POOL;
    const concept = poolToUse[Math.floor(Math.random() * poolToUse.length)];
    
    markTopicAsPublished(concept.title);
    return {
      title: concept.title,
      snippet: `Deep educational breakdown on ${concept.title}. Practical frameworks, key statistics, and actionable step-by-step strategies for high-performance builders.`,
      link: 'https://aimaxxing.com/masterclass',
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

    // Filter out ALREADY PUBLISHED topics and boring corporate headlines
    let candidateItems = feed.items.filter(item => {
      if (!item.title) return false;
      if (publishedHistory.has(item.title)) return false;
      const lower = item.title.toLowerCase();
      return !BORING_KEYWORDS.some(word => lower.includes(word));
    });

    if (candidateItems.length === 0) {
      candidateItems = feed.items.filter(item => item.title && !publishedHistory.has(item.title));
    }
    if (candidateItems.length === 0) {
      candidateItems = feed.items;
    }

    const topCandidates = candidateItems.slice(0, 8);
    const selectedItem = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    markTopicAsPublished(selectedItem.title);

    const categoryMap = {
      ai_research_papers: 'PAPER BREAKDOWN',
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
    const freshEvergreen = EVERGREEN_CONCEPT_POOL.filter(c => !publishedHistory.has(c.title));
    const poolToUse = freshEvergreen.length > 0 ? freshEvergreen : EVERGREEN_CONCEPT_POOL;
    const concept = poolToUse[Math.floor(Math.random() * poolToUse.length)];

    markTopicAsPublished(concept.title);
    return {
      title: concept.title,
      snippet: `Educational breakdown on ${concept.title}`,
      link: 'https://aimaxxing.com',
      category: concept.category,
      isEvergreen: true
    };
  }
}


