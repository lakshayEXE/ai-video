import { GoogleGenAI } from '@google/genai';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates a structured 5 to 7 slide agency-grade educational carousel JSON for Instagram.
 * @param {object|string} newsTopicInput - News topic object or string
 * @returns {Promise<object>} Structured agency-grade carousel JSON object
 */
export async function generateCarouselContent(newsTopicInput) {
  const ai = getAiClient();
  const topicTitle = typeof newsTopicInput === 'object' ? newsTopicInput.title : newsTopicInput;
  const topicCategory = (typeof newsTopicInput === 'object' && newsTopicInput.category) ? newsTopicInput.category : 'BUSINESS CASE STUDY';
  const topicSnippet = (typeof newsTopicInput === 'object' && newsTopicInput.snippet) ? newsTopicInput.snippet : topicTitle;

  const prompt = `You are the Senior Editorial Director for a top-tier media brand (like Visual Capitalist or Morning Brew) running (@hustle.maxxing).
Your task is to take this research topic:
TITLE: "${topicTitle}"
CATEGORY: "${topicCategory}"
CONTEXT: "${topicSnippet}"

Turn it into an agency-grade educational Instagram Carousel masterclass. Readers MUST learn actionable insights, frameworks, or case study takeaways that compel them to save and follow.

ANTI-AI HUMAN COPYWRITING PROTOCOL (CRITICAL):
- BANNED AI WORDS (NEVER USE IN SLIDES): "delve", "tapestry", "realm", "revolutionize", "game-changer", "pivotal", "testament", "unravel", "foster", "beacon", "furthermore", "moreover", "in conclusion", "it is worth noting", "paradigm shift".
- Write slide titles, descriptions, and takeaways in ultra-crisp, natural human language as if written by a top Wall Street Journal or Morning Brew senior editor. Zero fluff or AI jargon.

CRITICAL REQUIREMENT: Return ONLY raw valid JSON (no markdown block formatting, no code fences, no leading/trailing text).

Required JSON Structure Example (adapt slide array length between 5 and 7 items dynamically):
{
  "topic": "${topicTitle.replace(/"/g, '\\"')}",
  "category": "${topicCategory}",
  "read_time": "2 MIN READ",
  "slides": [
    {
      "slide_number": 1,
      "type": "cover",
      "category": "${topicCategory}",
      "title": "Punchy 6-8 Word Curiosity Title",
      "subtitle": "Compelling Teaser Subtitle Explaining What Readers Will Learn",
      "image_prompt": "Minimalist high-tech dark background with glowing emerald cyan abstract geometry",
      "alt_text": "High-contrast editorial cover slide about ${topicTitle.replace(/"/g, '\\"')}"
    },
    {
      "slide_number": 2,
      "type": "content",
      "step_number": "01",
      "headline": "The Hidden Shift / Core Problem",
      "stat_number": "+340%",
      "stat_label": "Market Advantage",
      "description": "1-2 sentences of ultra-sharp context explaining the core insight.",
      "key_takeaway": "Key Lesson: Focus on leverage over effort.",
      "image_prompt": "Dark glassmorphism metric visualization"
    },
    {
      "slide_number": 3,
      "type": "content",
      "step_number": "02",
      "headline": "The Core Strategy Framework",
      "bullets": [
        "First Principle: Identify non-linear growth levers.",
        "Execution: Automate 80% of repetitive operational tasks.",
        "Optimization: Measure speed-to-market over perfection."
      ],
      "key_takeaway": "Actionable Tip: Audit your workflow for bottlenecks.",
      "image_prompt": "Dark tech node architecture graphic"
    },
    {
      "slide_number": 4,
      "type": "content",
      "step_number": "03",
      "headline": "Execution Playbook & Case Study",
      "description": "Concrete 2-sentence guide on how to implement this strategy step-by-step.",
      "key_takeaway": "Pro Insight: Start small and compound daily.",
      "image_prompt": "Minimalist dark dashboard interface illustration"
    },
    {
      "slide_number": 5,
      "type": "cta",
      "category": "FREE BLUEPRINT",
      "title": "Want the Full Step-by-Step Guide?",
      "subtitle": "Comment 'GROWTH' below and I'll send you our complete resource kit for free.",
      "recap_bullets": [
        "✓ Actionable case study breakdown",
        "✓ Zero-friction implementation steps",
        "✓ High-leverage growth frameworks"
      ],
      "alt_text": "Call to action slide for Instagram educational carousel"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  let rawText = response.text.trim();
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const data = JSON.parse(rawText);
    if (data.slides && Array.isArray(data.slides)) {
      // Re-index slide numbers sequentially to ensure strict consistency
      data.slides.forEach((slide, idx) => {
        slide.slide_number = idx + 1;
      });
    }
    return data;
  } catch (err) {
    console.error('❌ Failed to parse Gemini Carousel JSON:', rawText);
    throw new Error(`Invalid Carousel JSON generated: ${err.message}`);
  }
}


