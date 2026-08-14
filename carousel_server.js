import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

import { getLatestNewsTopic } from './src/rss.js';
import { generateCarouselContent } from './src/carousel_prompt.js';
import { renderCarouselSlides } from './src/carousel_renderer.js';
import { uploadCarouselToInstagram } from './src/social/instagram_carousel.js';
import { Telegraf } from 'telegraf';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

async function runCarouselPipeline() {
  console.log('🚀 Starting Autonomous Agency-Grade Instagram Carousel Pipeline...');

  try {
    // Organic Random Delay (1-10 mins) when running in GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      const randomMinutes = Math.floor(Math.random() * 9) + 1;
      console.log(`⏱️ Running on GitHub Actions: Adding organic delay of ${randomMinutes} minutes...`);
      await new Promise((resolve) => setTimeout(resolve, randomMinutes * 60 * 1000));
    }

    // Step 1: Research Ingestion (News or Evergreen Concept)
    console.log('\n📰 Step 1: Ingesting high-signal topic via Multi-Feed Engine...');
    const newsTopic = await getLatestNewsTopic('mixed');
    console.log(`📌 Target Topic: "${newsTopic.title}" [Category: ${newsTopic.category || 'EXECUTIVE BREAKDOWN'}]`);

    // Step 2: Senior Editorial Copywriting via Gemini 2.5 Flash
    console.log('\n✍️ Step 2: Drafting Agency-Grade 5-Slide Masterclass via Gemini...');
    const carouselData = await generateCarouselContent(newsTopic);
    console.log(`✅ Masterclass JSON generated: "${carouselData.slides[0].title}"`);

    // Step 3: Render Agency-Grade Full-Bleed 1080x1350 PNG Slides via Puppeteer
    const outputDir = path.resolve('./tmp/carousel');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('\n🎨 Step 3: Rendering 1080x1350 Full-Bleed PNG slides with Puppeteer & HD Assets...');
    const slidePaths = await renderCarouselSlides(carouselData.slides, outputDir);

    const categoryTag = newsTopic.category || 'EXECUTIVE BREAKDOWN';
    const caption = `💡 [${categoryTag}] ${newsTopic.title}\n\nSwipe left to read the full step-by-step masterclass! Save this post to reference when building.\n\nComment 'GROWTH' below and I'll send you our complete resource template for free!\n\n#aimaxxing #ai #technology #solopreneur #tech #startups #productivity`;

    let instagramSuccess = false;
    let instagramError = '';

    // Step 4: Publish Carousel to Instagram
    if (process.env.DRY_RUN === 'true') {
      console.log('\n🧪 DRY_RUN=true: Skipping Instagram upload. PNG slides generated in ./tmp/carousel/');
      instagramError = 'DRY_RUN mode enabled.';
    } else {
      try {
        console.log('\n📤 Step 4: Uploading & Publishing Agency Carousel to Instagram...');
        await uploadCarouselToInstagram(slidePaths, caption, carouselData.slides);
        console.log('🎉 Successfully published Carousel to Instagram!');
        instagramSuccess = true;
      } catch (igErr) {
        instagramError = igErr.message;
        console.warn('⚠️ Instagram Carousel API Upload Failed:', instagramError);
      }
    }

    // Step 5: Telegram Dispatch (Send all 5 PNG Carousel slides to Telegram chat)
    if (botToken && chatId) {
      const bot = new Telegraf(botToken);
      if (instagramSuccess) {
        await bot.telegram.sendMessage(chatId, `🎉 *Published Carousel Infographic to Instagram!*\n\n📌 *Topic*: ${newsTopic.title}`, { parse_mode: 'Markdown' });
      } else {
        await bot.telegram.sendMessage(
          chatId,
          `⚠️ *Instagram Carousel Upload Failed*\n\nReason: \`${instagramError}\`\n\n📥 *Here are your 5 rendered HD PNG Carousel Slides!* Download and publish manually:`,
          { parse_mode: 'Markdown' }
        );
      }

      try {
        console.log('📱 Sending 5 Carousel PNG slides directly to Telegram chat...');
        const mediaGroup = slidePaths.map((filePath, idx) => ({
          type: 'photo',
          media: { source: filePath },
          caption: idx === 0 ? `📊 *${newsTopic.title}*\n\n${caption}` : '',
          parse_mode: 'Markdown'
        }));
        await bot.telegram.sendMediaGroup(chatId, mediaGroup);
        console.log('✅ Carousel slides delivered to Telegram chat!');
      } catch (tgMediaErr) {
        console.warn('⚠️ Telegram media group dispatch error:', tgMediaErr.message);
      }
    }

    console.log('\n🎉 Agency Carousel Pipeline Complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Carousel Pipeline Error:', error);
    if (botToken && chatId) {
      const bot = new Telegraf(botToken);
      await bot.telegram.sendMessage(chatId, `❌ Carousel Pipeline Fatal Error: ${error.message}`);
    }
    process.exit(1);
  }
}

runCarouselPipeline();

