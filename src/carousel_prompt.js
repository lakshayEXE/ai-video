import { GoogleGenAI } from '@google/genai';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates a structured 5-slide educational carousel JSON for Instagram.
 * @param {string} newsTopic - News headline or wealth topic summary
 * @returns {Promise<object>} Structured carousel JSON object
 */
export async function generateCarouselContent(newsTopic) {
  const ai = getAiClient();
  
  const prompt = `You are a top 1% Instagram Carousel copywriter for a high-end luxury wealth & AI page (@hustler.maxing).
Your task is to take this topic: "${newsTopic}" and turn it into a viral, high-converting 5-slide Instagram Carousel.

CRITICAL REQUIREMENT: Return ONLY raw valid JSON (no markdown block formatting, no code fences, no extra text).

JSON Structure required:
{
  "topic": "${newsTopic}",
  "slides": [
    {
      "slide_number": 1,
      "type": "cover",
      "tagline": "AI WEALTH HACK",
      "title": "Punchy 6-8 Word Hook Title Here",
      "subtitle": "Compelling Subtitle That Forces Viewers To Swipe Left",
      "alt_text": "High-contrast infographic cover slide about AI tools, side hustles, and wealth creation strategies for 2026"
    },
    {
      "slide_number": 2,
      "type": "content",
      "step_number": "01",
      "title": "Catchy Step or Tool Name",
      "description": "1-2 sentences of ultra-actionable, high-value advice or explanation.",
      "alt_text": "Educational slide explaining step 1 of AI business automation and online income"
    },
    {
      "slide_number": 3,
      "type": "content",
      "step_number": "02",
      "title": "Catchy Step or Tool Name",
      "description": "1-2 sentences of ultra-actionable, high-value advice or explanation."
    },
    {
      "slide_number": 4,
      "type": "content",
      "step_number": "03",
      "title": "Catchy Step or Tool Name",
      "description": "1-2 sentences of ultra-actionable, high-value advice or explanation."
    },
    {
      "slide_number": 5,
      "type": "cta",
      "tagline": "FREE BLUEPRINT",
      "title": "Want the Step-by-Step System?",
      "subtitle": "Comment 'WEALTH' below and I'll send you the free guide."
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt
  });

  let rawText = response.text.trim();
  
  // Clean potential markdown formatting
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const data = JSON.parse(rawText);
    return data;
  } catch (err) {
    console.error('❌ Failed to parse Gemini Carousel JSON:', rawText);
    throw new Error(`Invalid Carousel JSON generated: ${err.message}`);
  }
}
