import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { getSlideVisualAsset } from './carousel_assets.js';

/**
 * Format markdown bold text (**text**) into styled HTML
 */
function formatText(str) {
  if (!str) return '';
  return str.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff; font-weight: 800;">$1</strong>');
}

/**
 * Generates agency-grade HTML for a single carousel slide (1080x1350).
 */
function renderSlideHtml(slideData, slideIndex, totalSlides = 5, bgAssetPath = null) {
  const isCover = slideData.type === 'cover';
  const isCta = slideData.type === 'cta';
  const currentStep = slideIndex + 1;

  const categoryTag = slideData.category || 'EXECUTIVE BREAKDOWN';
  const readTime = slideData.read_time || '2 MIN READ';

  // Build top progress bar segments
  let progressBarHtml = '<div class="progress-bar">';
  for (let i = 1; i <= totalSlides; i++) {
    const activeClass = i <= currentStep ? 'active' : '';
    progressBarHtml += `<div class="progress-segment ${activeClass}"></div>`;
  }
  progressBarHtml += '</div>';

  // Base64 encode visual background image if present
  let bgStyle = '';
  if (bgAssetPath && fs.existsSync(bgAssetPath)) {
    const bgBase64 = fs.readFileSync(bgAssetPath).toString('base64');
    bgStyle = `
      background-image: 
        linear-gradient(180deg, rgba(7, 9, 14, 0.82) 0%, rgba(7, 9, 14, 0.94) 100%),
        url('data:image/png;base64,${bgBase64}');
      background-size: cover;
      background-position: center;
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1080px;
      height: 1350px;
      background-color: #07090e;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.22) 0%, transparent 48%),
        radial-gradient(circle at 85% 85%, rgba(6, 182, 212, 0.18) 0%, transparent 48%);
      ${bgStyle}
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 64px;
      position: relative;
      overflow: hidden;
    }

    /* Architectural Ambient Tech Grid */
    body::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
    }

    /* Top Segmented Progress Bar */
    .progress-bar {
      display: flex;
      gap: 8px;
      width: 100%;
      margin-bottom: 24px;
      z-index: 10;
    }
    .progress-segment {
      height: 6px;
      flex: 1;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 4px;
    }
    .progress-segment.active {
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
    }

    /* Top Navigation Bar */
    .nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      margin-bottom: 30px;
    }

    .category-badge {
      background: rgba(16, 185, 129, 0.15);
      border: 1.5px solid rgba(16, 185, 129, 0.5);
      color: #10b981;
      padding: 10px 24px;
      border-radius: 30px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: 2px;
      text-transform: uppercase;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    }

    .read-time {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 20px;
      color: #9ca3af;
      letter-spacing: 1px;
    }

    /* Main Full-Bleed Content Container */
    .main-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      z-index: 10;
      padding: 20px 0;
    }

    /* Cover Slide Styling */
    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 88px;
      line-height: 1.08;
      color: #ffffff;
      margin-bottom: 32px;
      letter-spacing: -2px;
      text-shadow: 0 4px 30px rgba(0,0,0,0.8);
    }

    .cover-subtitle {
      font-size: 38px;
      line-height: 1.45;
      color: #cbd5e1;
      font-weight: 500;
      margin-bottom: 50px;
    }

    .swipe-pill {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      padding: 18px 36px;
      border-radius: 50px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 24px;
      letter-spacing: 2px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
      width: fit-content;
    }

    /* Content Slide Styling */
    .step-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .step-num {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 36px;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 6px 20px;
      border-radius: 16px;
    }

    .content-headline {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 68px;
      line-height: 1.12;
      color: #ffffff;
      margin-bottom: 28px;
      letter-spacing: -1.5px;
    }

    /* Stat Box Component */
    .stat-card {
      display: flex;
      align-items: center;
      gap: 28px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 24px;
      padding: 24px 32px;
      margin-bottom: 28px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
    }
    .stat-num {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 82px;
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
    }
    .stat-label {
      font-size: 26px;
      font-weight: 700;
      color: #e2e8f0;
      line-height: 1.3;
    }

    .description-text {
      font-size: 36px;
      line-height: 1.48;
      color: #cbd5e1;
      font-weight: 500;
      margin-bottom: 32px;
    }

    /* Bullet Points Component */
    .bullet-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 32px;
    }

    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      font-size: 32px;
      line-height: 1.4;
      color: #e2e8f0;
      font-weight: 600;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 20px 24px;
    }

    .bullet-icon {
      color: #10b981;
      font-size: 32px;
      font-weight: 900;
      line-height: 1;
    }

    /* Glassmorphic Key Takeaway Card */
    .takeaway-card {
      background: rgba(16, 185, 129, 0.12);
      border: 1.5px solid rgba(16, 185, 129, 0.45);
      border-radius: 24px;
      padding: 24px 30px;
      color: #34d399;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.4;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    /* CTA Slide Styling */
    .cta-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.15) 100%);
      border: 2px solid rgba(16, 185, 129, 0.5);
      border-radius: 36px;
      padding: 48px 40px;
      text-align: center;
      margin-top: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }
    .cta-trigger {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 42px;
      color: #ffffff;
      margin-top: 24px;
    }
    .cta-keyword {
      color: #10b981;
      text-decoration: underline;
    }

    /* Footer Section */
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 28px;
      z-index: 10;
    }

    .brand-handle {
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 26px;
      color: #ffffff;
    }

    .brand-dot {
      width: 14px;
      height: 14px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 14px #10b981;
    }

    .save-prompt {
      color: #9ca3af;
      font-size: 22px;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- Top Progress Bar & Header -->
  <div>
    ${progressBarHtml}
    <div class="nav-bar">
      <div class="category-badge">${categoryTag}</div>
      <div class="read-time">${readTime}</div>
    </div>
  </div>

  <!-- Main Content Canvas -->
  <div class="main-content">
    ${isCover ? `
      <div class="cover-title">${formatText(slideData.title)}</div>
      <div class="cover-subtitle">${formatText(slideData.subtitle || '')}</div>
      <div class="swipe-pill">SWIPE TO LEARN 👉</div>
    ` : isCta ? `
      <div class="content-headline">${formatText(slideData.title)}</div>
      <div class="description-text">${formatText(slideData.subtitle || '')}</div>
      
      ${slideData.recap_bullets ? `
        <div class="bullet-list">
          ${slideData.recap_bullets.map(b => `<div class="bullet-item"><span class="bullet-icon">✓</span>${formatText(b)}</div>`).join('')}
        </div>
      ` : ''}

      <div class="cta-card">
        <div class="cta-trigger">Comment <span class="cta-keyword">"GROWTH"</span> to receive the full playbook!</div>
      </div>
    ` : `
      <div class="step-header">
        <div class="step-num">STEP ${slideData.step_number || '0' + (slideIndex + 1)}</div>
      </div>

      <div class="content-headline">${formatText(slideData.headline || slideData.title)}</div>

      ${slideData.stat_number ? `
        <div class="stat-card">
          <div class="stat-num">${slideData.stat_number}</div>
          <div class="stat-label">${formatText(slideData.stat_label || 'Impact Result')}</div>
        </div>
      ` : ''}

      ${slideData.description ? `
        <div class="description-text">${formatText(slideData.description)}</div>
      ` : ''}

      ${slideData.bullets ? `
        <div class="bullet-list">
          ${slideData.bullets.map(b => `<div class="bullet-item"><span class="bullet-icon">⚡</span>${formatText(b)}</div>`).join('')}
        </div>
      ` : ''}

      ${slideData.key_takeaway ? `
        <div class="takeaway-card">💡 ${formatText(slideData.key_takeaway)}</div>
      ` : ''}
    `}
  </div>

  <!-- Footer Section -->
  <div class="footer-bar">
    <div class="brand-handle">
      <div class="brand-dot"></div>
      @hustler.maxing
    </div>
    <div class="save-prompt">📌 Save For Later</div>
  </div>

</body>
</html>
  `;
}

/**
 * Renders an array of slide JSON objects into agency-grade 1080x1350 PNG image files.
 * @param {Array<object>} slidesData - Array of slide JSON objects
 * @param {string} outputDir - Directory to save PNG images
 * @returns {Promise<Array<string>>} Array of absolute paths to generated PNG image files
 */
export async function renderCarouselSlides(slidesData, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const assetsDir = path.join(outputDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log(`🎨 Launching Puppeteer to render ${slidesData.length} Agency-Grade Full-Bleed Slides (1080x1350)...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  const generatedPaths = [];

  for (let i = 0; i < slidesData.length; i++) {
    const slide = slidesData[i];

    // Attempt visual asset fetching for slide
    let bgAssetPath = null;
    if (slide.image_prompt) {
      const assetFile = path.join(assetsDir, `bg_slide_${i + 1}.jpg`);
      bgAssetPath = await getSlideVisualAsset(slide.image_prompt, assetFile);
    }

    const htmlContent = renderSlideHtml(slide, i, slidesData.length, bgAssetPath);

    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    const imagePath = path.join(outputDir, `slide_${i + 1}.png`);
    await page.screenshot({ path: imagePath, type: 'png' });

    console.log(`✅ Agency Slide ${i + 1}/${slidesData.length} rendered -> ${imagePath}`);
    generatedPaths.push(imagePath);
  }

  await browser.close();
  return generatedPaths;
}

