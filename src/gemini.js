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
 * Drafts an initial punchy 45-second vertical script for a cute 22yo female tech influencer.
 * @param {string} newsTopic - News headline or topic summary
 * @returns {Promise<string>}
 */
export async function generateScript(newsTopic) {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: `You are an expert TikTok/Reels copywriter who specializes in highly viral, dark-psychology "Wealth & Side Hustle" faceless videos.
Your goal is to spin this recent news topic into a secret money-making opportunity or intense wealth insight: "${newsTopic}".

CRITICAL SCRIPT STRUCTURE (Exactly 65 to 75 seconds of spoken text):
1. THE HOOK (First 3 seconds): Must be controversial, secretive, or a bold claim. (e.g. "If you are broke right now, it is entirely your fault." or "The rich are terrified that you will find out about this...")
2. THE PIVOT: Connect the hook to the news topic, framing it as a massive hidden opportunity that 99% of people are missing.
3. THE BLUEPRINT: Give 2 or 3 fast-paced, highly actionable "steps" on how the viewer can capitalize on this news to make money or get ahead.
4. THE CTA (Call To Action): End abruptly with engagement bait (e.g. "Save this video before they take it down, and comment 'WEALTH' for the step-by-step guide.")

RULES:
- Tone: Intense, authoritative, slightly aggressive, and motivational.
- NO brackets, NO stage directions, NO emojis in the spoken text. Spoken words ONLY.
- AT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, add exactly one tag: [SEARCH: <1-2 word query for highly relevant aesthetic b-roll>] (Examples: If script is about money use [SEARCH: luxury cars], if about tech use [SEARCH: abstract tech], if about jobs use [SEARCH: office building]). Ensure the visual matches the topic!`
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
    model: 'gemini-flash-latest',
    contents: `Current Script:\n"${currentScript}"\n\nUser Revision Request:\n"${userFeedback}"\n\nThink carefully about the feedback and rewrite the script maintaining the intense, motivational "Wealth & Side Hustle" faceless theme page persona. Output spoken words exactly 65 to 75 seconds long.\n\nAT THE VERY END OF YOUR RESPONSE, ON A NEW LINE, add exactly one tag like this: [SEARCH: <1-2 word query for highly relevant aesthetic b-roll>] (e.g. if script is about money use [SEARCH: luxury cars]). Ensure the visual matches the topic!`
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

  console.log(`🎙️ Synthesizing Gemini Voiceover (Voice: ${voiceName} - rich, young millionaire persona)...`);

  try {
    const audioResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: `Read the following script in the voice of a rich, confident, young 20-something millionaire giving intense advice:\n\n${scriptText}`,
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



