import { uploadToTmpFiles } from '../tmpupload.js';

/**
 * Uploads a multi-image Carousel post to Instagram via Meta Graph API.
 * @param {Array<string>} localImagePaths - Array of absolute local file paths to PNG slide images
 * @param {string} caption - Post caption text
 * @returns {Promise<object>} Result from Instagram Graph API publish endpoint
 */
export async function uploadCarouselToInstagram(localImagePaths, caption, slidesData = []) {
  const igUserId = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!igUserId || !token) {
    throw new Error('Missing Instagram API environment credentials (INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN).');
  }

  console.log(`☁️ Step 1: Uploading ${localImagePaths.length} slide images to temporary host...`);

  // Upload all slide PNGs concurrently to temporary host
  const publicUrls = await Promise.all(
    localImagePaths.map(filePath => uploadToTmpFiles(filePath))
  );

  console.log('✅ All slide images uploaded to public URLs:');
  publicUrls.forEach((url, i) => console.log(`   Slide ${i + 1}: ${url}`));

  // Step 2: Create sub-containers for each image item
  console.log('\n📤 Step 2: Creating Instagram Carousel Sub-Containers with Alt-Text SEO...');
  const itemContainerIds = [];

  for (let i = 0; i < publicUrls.length; i++) {
    const url = publicUrls[i];
    const handle = process.env.INSTAGRAM_HANDLE || '@hustle.maxxing';
    const slideInfo = slidesData[i] || {};
    const altText = slideInfo.alt_text || `AI wealth and side hustle guide slide ${i + 1} by ${handle}`;

    const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_carousel_item: true,
        image_url: url,
        alt_text: altText,
        access_token: token
      })
    });

    const data = await res.json();
    if (!data.id) {
      throw new Error(`Failed to create Carousel item container for slide ${i + 1}: ${JSON.stringify(data)}`);
    }

    console.log(`✅ Item Container ${i + 1}/${publicUrls.length} created ID: ${data.id}`);
    itemContainerIds.push(data.id);
  }

  // Step 3: Create Main Carousel Container
  console.log('\n📤 Step 3: Creating Main Instagram Carousel Container...');

  const carouselRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: itemContainerIds,
      caption: caption,
      access_token: token
    })
  });

  const carouselData = await carouselRes.json();
  if (!carouselData.id) {
    throw new Error(`Failed to create Main Carousel Container: ${JSON.stringify(carouselData)}`);
  }

  console.log(`✅ Main Carousel Container Created ID: ${carouselData.id}. Polling Meta processing status...`);

  // Step 4: Poll status and publish container
  const containerId = carouselData.id;
  const maxAttempts = 24; // Up to 2 minutes
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    await new Promise(res => setTimeout(res, 5000));

    try {
      const statusRes = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${token}`);
      const statusData = await statusRes.json();
      const statusCode = statusData.status_code;

      console.log(`⏳ [Attempt ${attempt}/${maxAttempts}] Carousel container ${containerId} status: ${statusCode || 'UNKNOWN'}`);

      if (statusCode === 'FINISHED' || !statusCode) {
        console.log(`🚀 Publishing Carousel Container ${containerId}...`);
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: token
          })
        });

        const publishData = await publishRes.json();
        if (publishData.error) {
          throw new Error(`Instagram Carousel Publish Error: ${JSON.stringify(publishData.error)}`);
        }

        console.log(`🎉 Successfully Published Carousel to Instagram! ID: ${publishData.id}`);
        return publishData;
      }

      if (statusCode === 'ERROR') {
        throw new Error(`Meta Carousel Processing Failed for Container ${containerId}: ${JSON.stringify(statusData)}`);
      }
    } catch (err) {
      if (attempt >= maxAttempts || err.message.includes('Publish Error') || err.message.includes('Processing Failed')) {
        throw err;
      }
      console.warn(`⚠️ Temporary error checking carousel status: ${err.message}. Retrying...`);
    }
  }

  throw new Error(`Meta Carousel processing timed out after 2 minutes for container ${containerId}.`);
}
