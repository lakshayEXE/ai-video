import dotenv from 'dotenv';
dotenv.config();

import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';

import { getLatestNewsTopic } from './src/rss.js';
import { generateScript, reviseScript, generateAudio } from './src/gemini.js';
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
async function runPipeline() {
  try {
    // Organic Random Delay (1-10 mins) when running in GitHub Actions to randomize timestamps
    if (process.env.GITHUB_ACTIONS) {
      const randomMinutes = Math.floor(Math.random() * 9) + 1;
      console.log(`⏱️ Running on GitHub Actions: Adding organic delay of ${randomMinutes} minutes...`);
      await new Promise((resolve) => setTimeout(resolve, randomMinutes * 60 * 1000));
    }

    if (bot) bot.launch(); 

    console.log('\n📰 Step 1: Fetching latest news from RSS feed...');
    const news = await getLatestNewsTopic('mixed');
    const topic = news.title;
    
    console.log(`✍️ Step 2: Drafting script via Gemini 2.5 Flash for topic: "${topic}"...`);
    const initialScript = await generateScript(news);

    if (bot && chatId) {
      await bot.telegram.sendMessage(
        chatId,
        `📝 *NEW SCRIPT DRAFT*\n\n*Topic:* ${topic}\n\n---\n${initialScript}\n---`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Approve Script', 'approve_script')],
            [Markup.button.callback('🔄 Rewrite with Feedback', 'feedback_script')],
            [Markup.button.callback('🛑 Cancel', 'abort')]
          ])
        }
      );
      console.log('📬 Script sent to Telegram. Waiting up to 5 minutes for approval...');
    }

    // Step 3: Wait for user approval or 5m timeout
    const finalScript = await waitForApproval(initialScript);

    // Stop listening to prevent GitHub Actions from hanging indefinitely
    if (bot) bot.stop('SIGINT');

    const tmpDir = path.resolve('./tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Step 4: Extract Search Query
    let searchQuery = 'luxury cars';
    let cleanScript = finalScript;
    const searchRegex = /\[SEARCH:\s*(.*?)\]/i;
    const match = finalScript.match(searchRegex);
    if (match && match[1]) {
      searchQuery = match[1].trim();
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

// Start Execution
runPipeline();
