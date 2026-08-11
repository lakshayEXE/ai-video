import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Generates an HTML string for a single carousel slide (1080x1350).
 */
function renderSlideHtml(slideData, totalSlides = 5) {
  const isCover = slideData.type === 'cover';
  const isCta = slideData.type === 'cta';

  const badgeText = isCover
    ? slideData.tagline || 'AI WEALTH HACK'
    : isCta
    ? slideData.tagline || 'FREE BLUEPRINT'
    : `STEP ${slideData.step_number || '0' + slideData.slide_number}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1080px;
      height: 1350px;
      background-color: #06070a;
      background-image: 
        radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.22) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(245, 158, 11, 0.15) 0%, transparent 45%);
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 80px 70px;
      position: relative;
      overflow: hidden;
    }

    /* Vibrant Grid overlay */
    body::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
    }

    /* Header Badge */
    .header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      z-index: 10;
    }

    .badge {
      background: rgba(16, 185, 129, 0.18);
      border: 2px solid rgba(16, 185, 129, 0.6);
      color: #10b981;
      padding: 14px 32px;
      border-radius: 40px;
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 24px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
    }

    /* Main Glassmorphism Content Card */
    .card {
      background: rgba(13, 16, 24, 0.85);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 40px;
      padding: 60px 55px;
      z-index: 10;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      margin-top: auto;
      margin-bottom: auto;
      position: relative;
    }

    .step-indicator {
      font-family: 'Outfit', sans-serif;
      font-size: 130px;
      font-weight: 900;
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 0.9;
      margin-bottom: 25px;
      letter-spacing: -2px;
    }

    .title {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: ${isCover ? '74px' : '62px'};
      line-height: 1.12;
      color: #ffffff;
      margin-bottom: 28px;
      letter-spacing: -1.5px;
    }

    .description {
      font-size: ${isCover ? '36px' : '34px'};
      line-height: 1.45;
      color: #e5e7eb;
      font-weight: 500;
    }

    /* Swipe Prompt Indicator */
    .swipe-hint {
      display: flex;
      align-items: center;
      gap: 14px;
      color: #10b981;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 26px;
      margin-top: 40px;
      letter-spacing: 1.5px;
    }

    .swipe-arrow {
      font-size: 32px;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 35px;
      z-index: 10;
    }

    .brand-handle {
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 28px;
      color: #ffffff;
    }

    .brand-dot {
      width: 16px;
      height: 16px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 16px #10b981;
    }

    .save-prompt {
      color: #9ca3af;
      font-size: 22px;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="badge">${badgeText}</div>
  </div>

  <div class="card">
    ${!isCover && !isCta ? `<div class="step-indicator">${slideData.step_number || '0' + slideData.slide_number}</div>` : ''}
    <div class="title">${slideData.title}</div>
    <div class="description">${slideData.subtitle || slideData.description || ''}</div>

    ${isCover ? `
      <div class="swipe-hint">
        SWIPE LEFT <span class="swipe-arrow">👉</span>
      </div>
    ` : ''}
  </div>

  <div class="footer">
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
 * Renders an array of slide JSON objects into 1080x1350 PNG image files.
 * @param {Array<object>} slidesData - Array of slide JSON objects
 * @param {string} outputDir - Directory to save PNG images
 * @returns {Promise<Array<string>>} Array of absolute paths to generated PNG image files
 */
export async function renderCarouselSlides(slidesData, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🎨 Launching Puppeteer to render ${slidesData.length} Carousel slides (1080x1350)...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  const generatedPaths = [];

  for (let i = 0; i < slidesData.length; i++) {
    const slide = slidesData[i];
    const htmlContent = renderSlideHtml(slide, slidesData.length);

    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    const imagePath = path.join(outputDir, `slide_${i + 1}.png`);
    await page.screenshot({ path: imagePath, type: 'png' });

    console.log(`✅ Slide ${i + 1}/${slidesData.length} rendered -> ${imagePath}`);
    generatedPaths.push(imagePath);
  }

  await browser.close();
  return generatedPaths;
}
