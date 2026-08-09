import Parser from 'rss-parser';

const parser = new Parser();

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=technology+ai&hl=en-US&gl=US&ceid=US:en',
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://wired.com/feed/category/business/latest/rss'
];

const seenNewsTitles = new Set();

/**
 * Fetches a fresh top news topic from RSS feeds without repeating recent headlines.
 * @returns {Promise<{title: string, snippet: string, link: string, pubDate: string}>}
 */
export async function getLatestNewsTopic() {
  // Pick a random feed from our list
  const randomFeedUrl = RSS_FEEDS[Math.floor(Math.random() * RSS_FEEDS.length)];
  const feed = await parser.parseURL(randomFeedUrl);

  if (!feed.items || feed.items.length === 0) {
    throw new Error('No news items found in RSS feed.');
  }

  // Filter out already seen news titles
  const freshItems = feed.items.filter(item => !seenNewsTitles.has(item.title));
  
  // If all items in this feed were seen, clear cache or use top available
  const candidateItems = freshItems.length > 0 ? freshItems : feed.items;

  // Pick randomly from top 8 candidates for variety
  const topCandidates = candidateItems.slice(0, 8);
  const selectedItem = topCandidates[Math.floor(Math.random() * topCandidates.length)];

  // Mark as seen
  seenNewsTitles.add(selectedItem.title);
  if (seenNewsTitles.size > 50) {
    // Keep set bounded
    const firstKey = seenNewsTitles.keys().next().value;
    seenNewsTitles.delete(firstKey);
  }

  return {
    title: selectedItem.title,
    snippet: selectedItem.contentSnippet || selectedItem.content || selectedItem.title,
    link: selectedItem.link,
    pubDate: selectedItem.pubDate
  };
}

