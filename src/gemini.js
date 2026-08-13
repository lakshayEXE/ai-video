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

/**
 * Drafts an initial punchy 45-second vertical script for a tech/business influencer.
 * @param {object|string} newsTopicInput - News headline object or topic summary
 * @returns {Promise<string>}
 */
export async function generateScript(newsTopicInput) {
  const ai = getAiClient();
  const topicTitle = typeof newsTopicInput === 'object' ? newsTopicInput.title : newsTopicInput;
  const topicCategory = (typeof newsTopicInput === 'object' && newsTopicInput.category) ? newsTopicInput.category : 'BUSINESS & TECH';
  const topicSnippet = (typeof newsTopicInput === 'object' && newsTopicInput.snippet) ? newsTopicInput.snippet : topicTitle;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are an elite, world-class media director and script architect for (@hustle.maxxing).

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
1. BANNED AI WORDS (NEVER USE): "delve", "tapestry", "realm", "revolutionize", "game-changer", "pivotal", "testament", "unravel", "foster", "beacon", "furthermore", "moreover", "in conclusion", "it is worth noting", "paradigm shift".
2. HUMAN BURSTINESS & RHYTHM: Vary sentence lengths drastically like real human speech. Mix ultra-short 2-3 word sentences ("Here is why.", "Look.", "Pay attention.") with natural conversational explanations.
3. NATURAL SPOKEN PHRASING: Always use natural spoken contractions ("here's", "it's", "don't", "that's", "you'll", "what's"). Speak like a high-level founder talking directly to a friend on a call.

--- SCRIPT FORMAT REQUIREMENTS (35 to 45 seconds spoken aloud, 85 to 110 words) ---
• Spoken words ONLY. NO stage directions, NO speaker names, NO emojis.
• AT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, add exactly one search tag with 3 relevant b-roll queries tailored to this topic:
[SEARCH: <query 1>, <query 2>, <query 3>]`
  });

  const draftScript = response.text.trim();
  
  // Pass 2: AI Viral Reviewer & Hook Maximizer Layer
  return await reviewAndRefineScript(draftScript, topicTitle);
}

/**
 * Pass 2: AI Viral Director Reviewer
 * Audits the draft script, maximizes 3-second clickbait & curiosity, and polishes human cadence.
 */
export async function reviewAndRefineScript(draftScript, topicTitle) {
  const ai = getAiClient();
  console.log('🧐 Pass 2: Running Gemini AI Viral Director Reviewer on draft script...');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are the Lead Viral Growth Director at (@hustle.maxxing).
Your job is to review and upgrade this draft video script about "${topicTitle}".

DRAFT SCRIPT:
"${draftScript}"

YOUR REVIEW & REFINEMENT OBJECTIVES:
1. AUDIT THE 3-SECOND HOOK: Make the first sentence 30% more high-stakes, curious, and irresistible ("viral clickbait" hook that compels people to pause scrolling instantly).
2. ELIMINATE throat-clearing: Ensure sentence 1 delivers an immediate punch with zero setup delays.
3. ENFORCE HUMAN VOICE & BURSTINESS: Remove any robotic AI buzzwords ("delve", "realm", "tapestry", "game-changer", "revolutionize"). Use natural contractions ("here's", "it's", "don't").
4. PRESERVE DURATION: Keep exact spoken length between 35 and 45 seconds (85 to 110 words).

RULES:
- Output pure spoken script text ONLY. NO stage directions, NO speaker labels, NO emojis.
- AT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, preserve or enhance the search tag:
[SEARCH: <query 1>, <query 2>, <query 3>]`
  });

  const polishedScript = response.text.trim();
  console.log('🔥 Pass 2: AI Script Review & 3-Second Viral Hook Optimization Complete!');
  return polishedScript;
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



