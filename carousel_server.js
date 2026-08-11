import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

import { getLatestNewsTopic } from './src/rss.js';
import { generateCarouselContent } from './src/carousel_prompt.js';
import { renderCarouselSlides } from './src/carousel_renderer.js';
import { uploadCarouselToInstagram } from './src/social/instagram_carousel.js';

async function runCarouselPipeline() {
  console.log('🚀 Starting Autonomous Instagram Carousel Pipeline...');

  try {
    // Organic Random Delay (1-10 mins) when running in GitHub Actions to randomize timestamps
    if (process.env.GITHUB_ACTIONS) {
      const randomMinutes = Math.floor(Math.random() * 9) + 1;
      console.log(`⏱️ Running on GitHub Actions: Adding organic delay of ${randomMinutes} minutes...`);
      await new Promise((resolve) => setTimeout(resolve, randomMinutes * 60 * 1000));
    }

    // Step 1: Fetch News Topic
    console.log('\n📰 Step 1: Fetching latest news from RSS feed...');
    const news = await getLatestNewsTopic();
    const topic = news.title;
    console.log(`📌 Target Topic: "${topic}"`);

    // Step 2: Generate Carousel Content via Gemini
    console.log('\n✍️ Step 2: Drafting 5-Slide Carousel via Gemini 2.5 Flash...');
    const carouselData = await generateCarouselContent(topic);
    console.log(`✅ Carousel JSON generated: "${carouselData.slides[0].title}"`);

    // Step 3: Render Slides via Puppeteer
    const outputDir = path.resolve('./tmp/carousel');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('\n🎨 Step 3: Rendering 1080x1350 PNG slides with Puppeteer...');
    const slidePaths = await renderCarouselSlides(carouselData.slides, outputDir);

    // Step 4: Publish Carousel to Instagram
    console.log('\n📤 Step 4: Uploading & Publishing Carousel to Instagram...');
    const caption = `💡 ${topic}\n\nSwipe left to learn the step-by-step strategy! Save this post for later.\n\nComment 'WEALTH' to get our free side hustle template!\n\n#wealth #sidehustle #business #success #ai`;
    
    await uploadCarouselToInstagram(slidePaths, caption, carouselData.slides);

    console.log('\n🎉 Carousel Pipeline Complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Carousel Pipeline Error:', error);
    process.exit(1);
  }
}

runCarouselPipeline();
