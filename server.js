import dotenv from 'dotenv';
dotenv.config();

import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';

import { getLatestNewsTopic } from './src/rss.js';
import { evaluateTopicVirality, generateScript, reviseScript, generateAudio } from './src/gemini.js';
import { processFinalVideo } from './src/editor.js';
import { downloadMultiplePexelsVideos } from './src/pexels.js';
import { uploadToTmpFiles } from './src/tmpupload.js';
import { uploadToInstagram } from './src/social/instagram.js';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const bot = botToken ? new Telegraf(botToken) : null;

/**
 * Waits for Telegram user approval or a 5-minute timeout.
 */
async function waitForApproval(script) {
  if (!bot) return script; 

  let currentScript = script;
  let resolved = false;

  if (!bot || !chatId || process.env.AUTO_APPROVE === 'true') {
    console.log('⏩ Auto-approving script (AUTO_APPROVE=true or headless mode)...');
    return Promise.resolve(script);
  }

  return new Promise((resolve) => {
    // 5-Minute Auto-Approve Timeout
    let timeoutId = setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        await bot.telegram.sendMessage(chatId, '⏰ 5 Minutes elapsed with no response. Auto-approving script to maintain publishing schedule.');
        resolve(currentScript);
      }
    }, 5 * 60 * 1000); 

    // Listeners for Interactive Buttons
    bot.action('approve_script', async (ctx) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      await ctx.answerCbQuery();
      await ctx.reply('✅ Script Approved manually! Generating video...');
      resolve(currentScript);
    });
    
    bot.action('abort', async (ctx) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      await ctx.answerCbQuery();
      await ctx.reply('🛑 Pipeline cancelled by user.');
      process.exit(0);
    });

    bot.action('feedback_script', async (ctx) => {
       await ctx.answerCbQuery();
       await ctx.reply('💬 Reply directly to this chat with your revision feedback:');
    });
    
    // Listener for Text Revisions
    bot.on('text', async (ctx) => {
      if (resolved) return;
      const feedback = ctx.message.text;
      await ctx.reply('🤖 Rewriting script incorporating your feedback...');
      currentScript = await reviseScript(currentScript, feedback);
      
      await ctx.reply(`📝 *REVISED SCRIPT*\n\n${currentScript}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Approve Script', 'approve_script')],
          [Markup.button.callback('🔄 Rewrite with Feedback', 'feedback_script')],
          [Markup.button.callback('🛑 Cancel', 'abort')]
        ])
      });

      // Restart the 5-minute timeout after sending a revision
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          await bot.telegram.sendMessage(chatId, '⏰ 5 Minutes elapsed. Auto-approving revised script.');
          resolve(currentScript);
        }
      }, 5 * 60 * 1000);
    });
  });
}

/**
 * Main Autonomous Pipeline (Designed for single-execution GitHub Actions cron)
 */
async function runPipeline(overrideNewsTopic = null) {
  try {
    // Organic Random Delay (1-10 mins) when running in GitHub Actions to randomize timestamps
    if (process.env.GITHUB_ACTIONS) {
      const randomMinutes = Math.floor(Math.random() * 9) + 1;
      console.log(`⏱️ Running on GitHub Actions: Adding organic delay of ${randomMinutes} minutes...`);
      await new Promise((resolve) => setTimeout(resolve, randomMinutes * 60 * 1000));
    }

    if (bot && !bot.polling) bot.launch(); 

    let news;
    if (overrideNewsTopic) {
      console.log(`⚡ Custom Topic Triggered via Telegram: "${overrideNewsTopic.title || overrideNewsTopic}"`);
      news = typeof overrideNewsTopic === 'string' ? { title: overrideNewsTopic, category: 'CUSTOM TOPIC' } : overrideNewsTopic;
    } else {
      console.log('\n📰 Step 1: Agent 0 (Virality Auditor) evaluating RSS news topics...');
      let viralityResult = { score: 0, reason: '' };
      let attempts = 0;

      // Up to 3 iterations to find a topic scoring >= 7/10 for US AI/tech audience
      while (attempts < 3) {
        attempts++;
        console.log(`\n🔄 Agent 0 Topic Evaluation Attempt ${attempts}/3...`);
        news = await getLatestNewsTopic('mixed');
        viralityResult = await evaluateTopicVirality(news);

        if (viralityResult.score >= 7) {
          console.log(`🎯 QUALIFIED VIRAL TOPIC ACCEPTED! (Score: ${viralityResult.score}/10)`);
          break;
        } else {
          console.log(`⚠️ Topic score ${viralityResult.score}/10 < 7. Rejecting & pausing 6s before candidate ${attempts + 1}...`);
          await new Promise((res) => setTimeout(res, 6000));
        }
      }
    }

    const topic = news.title;
    
    console.log('⏱️ Free Tier Pacing: Pausing 6 seconds before Agent 1 (Script Architect)...');
    await new Promise((res) => setTimeout(res, 6000));

    console.log(`✍️ Step 2: Executing Autonomous 4-Agent AI Pipeline for topic: "${topic}"...`);
    const scriptOutput = await generateScript(news);

    const draftScript = typeof scriptOutput === 'object' ? scriptOutput.draftScript : scriptOutput;
    const reviewerNotes = typeof scriptOutput === 'object' ? scriptOutput.reviewerNotes : 'FOMO & Urgency Hook Optimization Applied.';
    const finalScriptText = typeof scriptOutput === 'object' ? scriptOutput.finalScript : scriptOutput;
    const shotList = (typeof scriptOutput === 'object' && scriptOutput.shotList) ? scriptOutput.shotList : [];

    if (bot && chatId) {
      let sceneSummary = shotList.map(s => `• Scene ${s.scene} (${s.name}): "${s.query}" [${s.motion}]`).join('\n');

      const telegramMsg = `🎬 *AUTONOMOUS 4-AGENT REEL PIPELINE*\n\n` +
        `📌 *TOPIC:* ${topic}\n` +
        `📊 *AGENT 0 VIRALITY SCORE:* ${viralityResult.score}/10 (${viralityResult.reason})\n\n` +
        `1️⃣ *AGENT 1 (INITIAL DRAFT):*\n\`\`\`\n${draftScript}\n\`\`\`\n\n` +
        `2️⃣ *AGENT 2 (VIRAL DIRECTOR & FOMO BOOST):*\n${reviewerNotes}\n\n` +
        `3️⃣ *AGENT 3 (VISUAL SCENE DIRECTOR & SHOT SYNC):*\n${sceneSummary}\n\n` +
        `🔥 *FINAL SCRIPT FOR VOICEOVER:*\n\`\`\`\n${finalScriptText}\n\`\`\``;

      await bot.telegram.sendMessage(
        chatId,
        telegramMsg,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve & Render', 'approve_script')],
            [Markup.button.callback('🔄 Rewrite with Feedback', 'feedback_script')],
            [Markup.button.callback('🛑 Cancel', 'abort')]
          ])
        }
      );
      console.log('📬 3-Agent Script & Scene Breakdown sent to Telegram! Waiting for approval...');
    }

    // Step 3: Wait for user approval or 5m timeout
    const finalScript = await waitForApproval(finalScriptText);

    // Stop listening to prevent GitHub Actions from hanging indefinitely
    if (bot) bot.stop('SIGINT');

    const tmpDir = path.resolve('./tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Step 4: Extract Search Query & Clean Script
    let searchQuery = shotList.length > 0 ? shotList.map(s => s.query).join(', ') : 'cyberpunk technology AI, software developer code, workstation setup';
    let cleanScript = finalScript;
    const searchRegex = /\[SEARCH:\s*(.*?)\]/i;
    const match = finalScript.match(searchRegex);
    if (match && match[1]) {
      if (shotList.length === 0) searchQuery = match[1].trim();
      cleanScript = finalScript.replace(searchRegex, '').trim();
    }

    // Step 5: Audio
    const audioPath = path.join(tmpDir, 'voiceover.wav');
    console.log('🎙️ Generating voiceover audio...');
    await generateAudio(cleanScript, audioPath);

    // Step 6: B-Roll & AI Avatar Hook
    console.log(`🎥 Downloading 12 aesthetic B-Roll clips for "${searchQuery}"...`);
    let rawVideoPaths = await downloadMultiplePexelsVideos(searchQuery, 12, tmpDir);

    // If Colab GPU webhook is active, render AI Avatar Intro for the first 3 seconds
    if (process.env.COLAB_WEBHOOK_URL) {
      try {
        console.log('👤 COLAB_WEBHOOK_URL detected! Generating 3s AI Talking Avatar intro...');
        const avatarOut = path.join(tmpDir, 'avatar_intro.mp4');
        const { renderAvatarFromColab } = await import('./src/avatar.js');
        await renderAvatarFromColab(audioPath, avatarOut);
        rawVideoPaths.unshift(avatarOut);
        console.log('✅ AI Talking Avatar intro prepended to video timeline!');
      } catch (err) {
        console.warn('⚠️ Avatar rendering via Colab skipped/failed, using Pexels face hook:', err.message);
      }
    }

    // Step 7: Video Render
    console.log('🎬 Stitching clips & formatting vertical video...');
    const finalVideoPath = path.join(tmpDir, 'final_output.mp4');
    await processFinalVideo(rawVideoPaths, audioPath, cleanScript, finalVideoPath);

    // Step 8: Upload to Temporary File Host (needed for Instagram API public URL)
    const publicUrl = await uploadToTmpFiles(finalVideoPath);

    // Step 9: Post to Instagram
    console.log('📤 Posting to Instagram Reels...');
    const caption = `${topic}\n\nComment 'WEALTH' to get the free side hustle guide!\n\n#wealth #sidehustle #success #hustle`;
    await uploadToInstagram(publicUrl, caption);
    
    console.log('🎉 Successfully published to Instagram!');
    
    if (bot && chatId) {
      // Re-initialize bot briefly to send the final success message
      const tempBot = new Telegraf(botToken);
      await tempBot.telegram.sendMessage(chatId, '🎉 Successfully published to Instagram Reels!');
    }

    // Exit gracefully to complete the GitHub Action
    process.exit(0);

  } catch (err) {
    console.error('❌ Pipeline Error:', err);
    if (bot && chatId) {
        const tempBot = new Telegraf(botToken);
        await tempBot.telegram.sendMessage(chatId, `❌ Pipeline Error: ${err.message}`);
    }
    process.exit(1);
  }
}

// Telegram Interactive Command Handler Mode
if (process.argv.includes('--bot-listen') || process.env.ENABLE_BOT_POLLING === 'true') {
  if (bot && chatId) {
    console.log('🤖 Telegram Bot Polling Mode Active! Listening for commands...');

    bot.command('start', (ctx) => {
      ctx.reply(`⚡ (@hustle.maxxing) AI Influencer Engine Control Panel:

• /generate <custom topic> - Build reel for custom topic
• /viral - Trigger Agent 0 viral news search & build
• /stats - View B-roll cache & pipeline health`);
    });

    bot.command('stats', (ctx) => {
      const cacheDir = path.join(process.cwd(), 'assets', 'broll_cache');
      const cacheCount = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter(f => f.endsWith('.mp4')).length : 0;
      ctx.reply(`📊 Pipeline Health & Cache Stats:
• B-Roll HD Clips in Cache: ${cacheCount}
• Gemini API Free Tier Pacing: 6s active delay
• Target Audience: US Tech / SaaS / Solopreneurs`);
    });

    bot.command('viral', async (ctx) => {
      ctx.reply('🚀 Triggering Agent 0 Virality Auditor & Reel Pipeline...');
      runPipeline();
    });

    bot.command('generate', async (ctx) => {
      const text = ctx.message.text.replace('/generate', '').trim();
      if (!text) {
        return ctx.reply('⚠️ Please specify a topic! Example:\n/generate Sam Altman announced GPT-5');
      }
      ctx.reply(`🎬 Creating 4-Agent Reel for custom topic:\n"${text}"...`);
      runPipeline({ title: text, category: 'CUSTOM TECH ALERT' });
    });

    bot.launch();
  }
} else {
  // Direct Execution Mode for GitHub Actions Cron or Local CLI
  runPipeline();
}
