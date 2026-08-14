import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import gTTS from 'gtts';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiWithRetry(contents, model = 'gemini-2.5-flash', retries = 4, config = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ai = getAiClient();
      return await ai.models.generateContent({ model, contents, config });
    } catch (err) {
      if (err.status === 429 || (err.message && err.message.includes('RESOURCE_EXHAUSTED'))) {
        const waitSec = attempt * 20;
        console.warn(`⏳ Gemini Free Tier Rate Limit (429) hit on attempt ${attempt}/${retries}. Pausing ${waitSec} seconds for quota reset...`);
        await sleep(waitSec * 1000);
      } else {
        throw err;
      }
    }
  }
  throw new Error('Gemini API free tier quota limit reached.');
}

/**
 * Agent 0: Virality Auditor & Topic Scorer
 * Rates news topics 1-10 specifically for an American AI/Tech/Solopreneur audience using Live Search Grounding.
 */
export async function evaluateTopicVirality(newsTopicInput) {
  const title = typeof newsTopicInput === 'object' ? newsTopicInput.title : newsTopicInput;
  const snippet = (typeof newsTopicInput === 'object' && newsTopicInput.snippet) ? newsTopicInput.snippet : title;

  console.log(`📊 Agent 0: Evaluating virality & trend relevance for topic: "${title}"...`);

  let response;
  try {
    response = await callGeminiWithRetry(
      `You are the Head of Virality & Audience Intelligence at (@ai.maxxing_).
Analyze this tech/business news topic and rate its viral potential out of 10 for an American AI, Tech, SaaS, and Solopreneur audience on Instagram Reels / TikTok.

TOPIC: "${title}"
CONTEXT: "${snippet}"

EVALUATION CRITERIA:
1. High-Stakes Relevance (OpenAI, Claude, DeepSeek, AI Agents, Big Tech, Wealth, Productivity).
2. Audience Curiosity & Shock Value.
3. Actionable or High-FOMO Angle.

FORMAT INSTRUCTIONS:
Return a JSON object ONLY in this schema:
{
  "score": 9,
  "reason": "High FOMO technical paradigm shift for tech founders."
}`,
      'gemini-2.5-flash',
      3
    );
  } catch (err) {
    console.warn('⚠️ Agent 0 Virality Auditor fallback applied:', err.message);
    return { score: 8, reason: "High interest tech concept accepted via fallback." };
  }

  try {
    const rawJson = response.text.trim().replace(/```json|```/g, '').trim();
    const result = JSON.parse(rawJson);
    console.log(`📊 Agent 0 Virality Score: ${result.score}/10 | Reason: ${result.reason}`);
    return result;
  } catch (err) {
    console.warn('⚠️ Agent 0 Virality Auditor parse error, defaulting score to 8:', err.message);
    return { score: 8, reason: "Default high interest tech topic." };
  }
}

/**
 * Drafts an initial punchy 45-second vertical script for a tech/business influencer.
 * @param {object|string} newsTopicInput - News headline object or topic summary
 * @returns {Promise<string>}
 */
export async function generateScript(newsTopicInput) {
  const topicTitle = typeof newsTopicInput === 'object' ? newsTopicInput.title : newsTopicInput;
  const topicCategory = (typeof newsTopicInput === 'object' && newsTopicInput.category) ? newsTopicInput.category : 'BUSINESS & TECH';
  const topicSnippet = (typeof newsTopicInput === 'object' && newsTopicInput.snippet) ? newsTopicInput.snippet : topicTitle;

  console.log('✍️ Agent 1: Drafting initial script...');
  const response = await callGeminiWithRetry(`You are an elite, world-class media director and script architect for (@ai.maxxing_).

Your job is to analyze this topic and cook ONE PURE, MASTERFULLY TAILORED 40-second vertical video script (Reels/TikTok).

TOPIC TITLE: "${topicTitle}"
CATEGORY: "${topicCategory}"
CONTEXT: "${topicSnippet}"

CRITICAL RULE - DO NOT MIX STYLES ("DON'T MIX SPICES IN THE SAME DISH"):
Evaluate the topic and commit 100% to EXACTLY ONE of the 4 pure styles below. Do NOT combine hype with calm, or mix educational teaching with aggressive selling. Pick the SINGLE best style for this specific topic:

--- STYLE 1: PURE EDUCATIONAL MASTERCLASS ---
(Use if the topic is a technical framework, developer tool, or system architecture)
• Tone: Calm, articulate, high-signal technical lead / professor.
• Hook: Direct technical paradigm shift (e.g., "${topicTitle} is changing how we build modern software...").
• Body: 2 clear, step-by-step masterclass insights with zero fluff.

--- STYLE 2: PURE HIGH-STAKES OPPORTUNITY & LEVERAGE ---
(Use if the topic involves business models, AI monetization, or economic shifts)
• Tone: Confident, sharp, high-performance founder.
• Hook: High-stakes curiosity & economic leverage (e.g., "While 99% of people miss this shift, top teams are leveraging ${topicTitle} to build $5,000/week systems...").
• Body: 3 fast-paced actionable steps with strong psychological open-loops.

--- STYLE 3: PURE BREAKING NEWS & SECURITY ALERT ---
(Use if the topic is an urgent flaw, corporate acquisition, or sudden release)
• Tone: Razor-sharp, direct executive news teardown.
• Hook: Immediate, zero-delay revelation (e.g., "${topicTitle} just dropped, and here is the exact breakdown...").
• Body: Immediate root-cause analysis and actionable defense steps.

--- STYLE 4: PURE AUTHORITY & TWEET QUOTE BREAKDOWN ---
(Use if the topic features a quote or perspective from a famous CEO/founder like Sam Altman, Musk, Naval, etc.)
• Tone: Reflective, authoritative, analytical.
• Hook: Direct quote/tweet opening (e.g., "[Leader] just stated something that every founder needs to pay attention to...").
• Body: Analyzing the deeper strategic implications.

--- STYLE 5: TIMELESS PHILOSOPHY, HISTORICAL PARALLELS & PATTERN MATCHING ---
(Use if the topic maps to a timeless principle from ancient philosophy, Bhagavad Gita, Stoicism, Sun Tzu, or famous tech history like 1995 Internet / Oppenheimer)
• Tone: Visionary, cinematic, high-authority storyteller.
• Hook: Connect a timeless quote or historical parallel to today's topic (e.g., "When Oppenheimer witnessed nuclear energy, he quoted the Gita: 'Now I am become Death.' Today, AI researchers at OpenAI face that exact same threshold with ${topicTitle}...").
• Body: Draw a mind-blowing parallel between the timeless wisdom/history and what is happening right now with this topic.

--- ANTI-AI DETECTION & HUMAN VOICE PROTOCOL (CRITICAL) ---
Make the script sound 100% human, authentic, and organic. Eliminate all robotic AI writing signatures:
1. HIGH ENERGY & FOMO URGENCY: Deliver with high-stakes urgency. Make the audience feel like they are falling behind or missing out on a massive opportunity if they skip this video.
2. BANNED AI WORDS (NEVER USE): "delve", "tapestry", "realm", "revolutionize", "game-changer", "pivotal", "testament", "unravel", "foster", "beacon", "furthermore", "moreover", "in conclusion", "it is worth noting", "paradigm shift".
3. HUMAN BURSTINESS & RHYTHM: Vary sentence lengths drastically like real human speech. Mix ultra-short 2-3 word sentences ("Stop.", "Look.", "Pay attention.") with natural conversational explanations.
4. NATURAL SPOKEN PHRASING: Always use natural spoken contractions ("here's", "it's", "don't", "that's", "you'll", "what's"). Speak like a high-level founder talking directly to a friend on an urgent call.

--- SCRIPT FORMAT REQUIREMENTS (35 to 45 seconds spoken aloud, 85 to 110 words) ---
• Spoken words ONLY. NO stage directions, NO speaker names, NO emojis.
• AT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, add exactly one search tag with 3 short 2-word visual Pexels queries matching this specific topic (e.g. [SEARCH: macbook desk setup, software developer code, futuristic AI technology]):
[SEARCH: <query 1>, <query 2>, <query 3>]`);

  const draftScript = response.text.trim();
  
  // Pacing delay to respect Gemini Free Tier 15 RPM limits
  console.log('⏱️ Free Tier Pacing: Pausing 10 seconds before Agent 2...');
  await sleep(10000);

  // Agent 2: AI Viral Reviewer & FOMO Maximizer Layer
  const reviewResult = await reviewAndRefineScript(draftScript, topicTitle);

  // Pacing delay to respect Gemini Free Tier 15 RPM limits
  console.log('⏱️ Free Tier Pacing: Pausing 10 seconds before Agent 3...');
  await sleep(10000);

  // Agent 3: Visual Scene Director & Shot Sync Agent Layer
  const shotList = await generateSceneShotList(reviewResult.finalScript, topicTitle);

  return {
    draftScript,
    reviewerNotes: reviewResult.reviewerNotes,
    finalScript: reviewResult.finalScript,
    shotList
  };
}

/**
 * Agent 2: AI Viral Director Reviewer
 * Audits draft script, generates explicit viral director feedback, and outputs final high-FOMO script.
 */
export async function reviewAndRefineScript(draftScript, topicTitle) {
  console.log('🧐 Agent 2: Running Gemini AI Viral Director Reviewer on draft script...');

  const response = await callGeminiWithRetry(`You are the Lead Viral Growth Director at (@ai.maxxing_).
Your job is to review and upgrade this draft video script about "${topicTitle}".

DRAFT SCRIPT:
"${draftScript}"

YOUR REVIEW & REFINEMENT OBJECTIVES:
1. AUDIT THE 3-SECOND HOOK FOR INTENSE FOMO & HIGH URGENCY: Make sentence 1 high-energy, razor-sharp, and urgent ("If you skip this, you are missing out on the biggest shift right now...").
2. ELIMINATE throat-clearing: Ensure sentence 1 delivers an immediate punch with zero setup delays.
3. ENFORCE HUMAN VOICE & BURSTINESS: Remove any robotic AI buzzwords ("delve", "realm", "tapestry", "game-changer", "revolutionize"). Use natural contractions ("here's", "it's", "don't").
4. PRESERVE DURATION: Keep exact spoken length between 35 and 45 seconds (85 to 110 words).

FORMAT INSTRUCTIONS:
First, provide 2 short bullet points under "[PASS 2 AUDIT NOTES]" explaining what you improved (e.g. hook FOMO boost & word cuts).
Then, provide "[FINAL REFINED SCRIPT]" containing ONLY the final polished spoken text + search tag.

Example Output Format:
[PASS 2 AUDIT NOTES]
- Amplified 3-second hook with 40% higher urgency and FOMO ("Stop scrolling...").
- Trimmed setup filler and removed AI buzzwords.

[FINAL REFINED SCRIPT]
Stop scrolling if you build in tech. Sam Altman just dropped...
[SEARCH: Sam Altman, AI artificial intelligence, technology code]`);

  const rawText = response.text.trim();
  
  let reviewerNotes = 'Amplified 3-second hook for intense FOMO & high-stakes urgency.';
  let finalScript = rawText;

  if (rawText.includes('[PASS 2 AUDIT NOTES]') && rawText.includes('[FINAL REFINED SCRIPT]')) {
    const parts = rawText.split('[FINAL REFINED SCRIPT]');
    reviewerNotes = parts[0].replace('[PASS 2 AUDIT NOTES]', '').trim();
    finalScript = parts[1].trim();
  }

  console.log('🔥 Agent 2: AI Script Review & 3-Second Viral Hook Optimization Complete!');
  return { reviewerNotes, finalScript };
}

/**
 * Agent 3: Visual Scene Director & Shot Sync Agent
 * Maps script lines 1:1 with 4 sequential visual scenes and assigns Ken Burns camera motion vectors.
 */
export async function generateSceneShotList(finalScript, topicTitle) {
  console.log('🎬 Agent 3: Running Visual Scene Director & Shot Sync Agent...');

  try {
    const response = await callGeminiWithRetry(`You are the Lead Visual Director at (@ai.maxxing_).
Your job is to take this video script about "${topicTitle}" and create a 4-Scene Shot List mapping the spoken text directly to visual B-roll scenes and camera motion vectors.

SCRIPT:
"${finalScript}"

TASK:
Break down the script into 4 sequential scenes:
- Scene 1 (Hook - 0s to 4s): High-stakes visual term + motion (e.g., zoom_in)
- Scene 2 (Mechanism - 4s to 18s): Technical/system visual term + motion (e.g., pan_right)
- Scene 3 (Shift - 18s to 32s): Impact/metrics visual term + motion (e.g., zoom_out)
- Scene 4 (CTA - 32s to 40s): Brand/action visual term + motion (e.g., pan_left)

FORMAT INSTRUCTIONS:
Return a JSON array ONLY with 4 scene objects in this exact schema:
[
  { "scene": 1, "name": "Hook", "query": "cyberpunk glowing AI core", "motion": "zoom_in" },
  { "scene": 2, "name": "Mechanism", "query": "software developer dark code screen", "motion": "pan_right" },
  { "scene": 3, "name": "Shift", "query": "futuristic workstation tech setup", "motion": "zoom_out" },
  { "scene": 4, "name": "CTA", "query": "dark tech smartphone app screen", "motion": "pan_left" }
]`);

    const rawJson = response.text.trim().replace(/```json|```/g, '').trim();
    const shotList = JSON.parse(rawJson);
    console.log('✅ Agent 3: 4-Scene Shot List & Camera Motion Vectors generated!');
    return shotList;
  } catch (err) {
    console.warn('⚠️ Agent 3 fallback shot list applied:', err.message);
    const searchMatch = finalScript.match(/\[SEARCH:\s*(.*?)\]/i);
    const searchTerms = searchMatch ? searchMatch[1].split(',').map(s => s.trim()) : [topicTitle];
    
    return [
      { scene: 1, name: "Hook", query: searchTerms[0] || "cyberpunk glowing AI core", motion: "zoom_in" },
      { scene: 2, name: "Mechanism", query: searchTerms[1] || "software developer code screen", motion: "pan_right" },
      { scene: 3, name: "Shift", query: searchTerms[2] || "futuristic workstation setup", motion: "zoom_out" },
      { scene: 4, name: "CTA", query: "dark tech smartphone app screen", motion: "pan_left" }
    ];
  }
}

/**
 * Rewrites the script incorporating user revision feedback.
 * @param {string} currentScript - Current script content
 * @param {string} userFeedback - Revision request from user
 * @returns {Promise<string>}
 */
export async function reviseScript(currentScript, userFeedback) {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Current Script:\n"${currentScript}"\n\nUser Revision Request:\n"${userFeedback}"\n\nThink carefully about the feedback and rewrite the script maintaining an authoritative, high-value tech & business influencer tone. Output spoken words exactly 45 seconds long.\n\nAT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, add exactly one tag: [SEARCH: <query 1>, <query 2>, <query 3>]. Ensure the visual search query matches the topic!`
  });
  return response.text.trim();
}


function createWavHeader(pcmLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  header.writeUInt32LE(byteRate, 28);
  const blockAlign = numChannels * (bitsPerSample / 8);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmLength, 40);
  return header;
}

/**
 * Generates gTTS fallback audio if Gemini quota rate limits occur.
 */
function generateGTTSAudio(text, outputPath) {
  return new Promise((resolve, reject) => {
    const gtts = new gTTS(text, 'en');
    gtts.save(outputPath, (err) => {
      if (err) reject(err);
      else resolve(outputPath);
    });
  });
}

/**
 * Generates natural voiceover audio using Gemini 3.1 Flash Live voice model, with automatic gTTS fallback.
 * @param {string} scriptText - Script to generate voiceover for
 * @param {string} outputPath - Target file path (.wav or .mp3)
 * @param {string} voiceName - Gemini voice ('Kore' | 'Aoede' | 'Puck' | 'Charon' | 'Fenrir')
 * @returns {Promise<string>} Output audio file path
 */
export async function generateAudio(scriptText, outputPath, voiceName = 'Puck') {
  const ai = getAiClient();
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`🎙️ Synthesizing Gemini Voiceover (Voice: ${voiceName} - calm, authoritative executive persona)...`);

  try {
    const audioResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: `Read the following script in a calm, composed, articulate, and authoritative voice of an elite tech executive giving high-signal advice with clear pacing:\n\n${scriptText}`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    });

    const candidate = audioResponse.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part && part.inlineData && part.inlineData.data) {
      const pcmBuffer = Buffer.from(part.inlineData.data, 'base64');
      const wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

      fs.writeFileSync(outputPath, wavBuffer);
      console.log(`✅ Gemini 3.1 Flash Voiceover saved (${wavBuffer.length} bytes) -> ${outputPath}`);
      return outputPath;
    }
  } catch (err) {
    console.warn(`⚠️ Gemini Voice API hit rate limit / quota error (${err.message}). Activating instant zero-quota Fallback Voice Engine...`);
  }

  // Instant Fallback to gTTS if Gemini quota is exceeded
  await generateGTTSAudio(scriptText, outputPath);
  console.log(`✅ Fallback Voiceover synthesized & saved -> ${outputPath}`);
  return outputPath;
}



