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

  console.log(`✅ Main Carousel Container Created ID: ${carouselData.id}. Waiting 15s for Meta processing...`);

  await new Promise(resolve => setTimeout(resolve, 15000));

  // Step 4: Publish Main Carousel Container
  console.log(`📤 Publishing Carousel Container ${carouselData.id}...`);
  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: carouselData.id,
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
