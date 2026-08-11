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
    contents: `You are an elite, top 1% tech & business strategist running (@hustle.maxxing).
Your style is calm, razor-sharp, authoritative, and direct. You get straight to the point with zero filler or hype delays.

Spin this research topic into a punchy 40-second vertical video script (Instagram Reels / TikTok):

TOPIC TITLE: "${topicTitle}"
CATEGORY: "${topicCategory}"
CONTEXT: "${topicSnippet}"

CRITICAL SCRIPT STRUCTURE (35 to 45 seconds spoken aloud, approx 85-110 words):
1. THE DIRECT POINT (First 2 seconds): Immediately state EXACTLY what this reel is about in one razor-sharp, high-signal sentence! (e.g., "${topicTitle} is changing how we build software, and here is what you need to know...", or "If you are following traditional methods, ${topicTitle} just made them obsolete.").
2. THE CORE BREAKDOWN: Give 2 or 3 clear, high-value steps or insights that explain why this matters right now.
3. THE ACTIONABLE TAKEAWAY: Tell the audience the exact leverage point (e.g. "Step 2 is the exact step most founders skip...").
4. THE QUICK CTA: End cleanly (e.g. "Save this reel for your next build, and comment 'BLUEPRINT' for the full guide.")

RULES:
- Tone: Calm, authoritative, articulate executive / high-performance tech founder.
- Grounding: Must get to the core of "${topicTitle}" IMMEDIATELY in sentence 1.
- NO stage directions, NO speaker labels, NO emojis in the spoken script text. Pure spoken words ONLY.
- AT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, add exactly one search tag with 3 relevant b-roll queries tailored to this topic:
[SEARCH: <query 1>, <query 2>, <query 3>]`
  });
  return response.text.trim();
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



