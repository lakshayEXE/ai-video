/**
 * Uploads video to Instagram Reels using the Meta Graph API.
 * @param {string} publicVideoUrl - Publicly accessible video URL (e.g. via Ngrok tunnel)
 * @param {string} caption - Post caption
 * @returns {Promise<object>} Result from Instagram Graph API publish endpoint
 */
export async function uploadToInstagram(publicVideoUrl, caption) {
  const igUserId = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!igUserId || !token) {
    throw new Error('Missing Instagram API environment credentials (INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN).');
  }

  console.log(`📤 Step 1: Creating Instagram Reels Container for URL: ${publicVideoUrl}`);

  // Pick a random top US city location ID (New York, Los Angeles, Miami)
  const usLocations = [
    '212988691', // New York, New York
    '213385484', // Los Angeles, California
    '213004060'  // Miami, Florida
  ];
  const randomUsLocation = usLocations[Math.floor(Math.random() * usLocations.length)];

  // Step 1: Create Media Container
  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: publicVideoUrl,
      caption: caption,
      location_id: randomUsLocation,
      access_token: token
    })
  });

  const containerData = await containerRes.json();

  if (!containerData.id) {
    throw new Error(`Instagram Container Creation Error: ${JSON.stringify(containerData)}`);
  }

  console.log(`✅ Container Created ID: ${containerData.id}. Waiting 40s for Meta video processing...`);

  // Step 2: Publish Container after buffer
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        console.log(`📤 Step 2: Publishing Instagram Reels Container ${containerData.id}...`);
        const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: token
          })
        });

        const publishData = await publishRes.json();
        if (publishData.error) {
          return reject(new Error(`Instagram Publish Error: ${JSON.stringify(publishData.error)}`));
        }

        console.log(`✅ Successfully Published to Instagram Reels! ID: ${publishData.id}`);
        resolve(publishData);
      } catch (err) {
        reject(err);
      }
    }, 40000); // 40-second processing buffer
  });
}
