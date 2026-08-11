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

  // Step 1: Create Media Container
  const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: publicVideoUrl,
      caption: caption,
      access_token: token
    })
  });

  const containerData = await containerRes.json();

  if (!containerData.id) {
    throw new Error(`Instagram Container Creation Error: ${JSON.stringify(containerData)}`);
  }

  console.log(`✅ Container Created ID: ${containerData.id}. Polling Meta processing status...`);

  // Step 2: Poll Meta Graph API container status until FINISHED
  const containerId = containerData.id;
  const maxAttempts = 36; // Up to 3 minutes total
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    await new Promise((res) => setTimeout(res, 5000)); // wait 5s between checks

    try {
      const statusRes = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${token}`);
      const statusData = await statusRes.json();

      const statusCode = statusData.status_code;
      console.log(`⏳ [Attempt ${attempt}/${maxAttempts}] Container ${containerId} status: ${statusCode || 'UNKNOWN'}`);

      if (statusCode === 'FINISHED') {
        console.log(`🚀 Meta container processing complete! Publishing to Instagram Reels...`);
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
          throw new Error(`Instagram Publish Error: ${JSON.stringify(publishData.error)}`);
        }

        console.log(`✅ Successfully Published to Instagram Reels! ID: ${publishData.id}`);
        return publishData;
      }

      if (statusCode === 'ERROR') {
        throw new Error(`Meta Video Processing Failed for Container ${containerId}: ${JSON.stringify(statusData)}`);
      }
    } catch (err) {
      if (attempt >= maxAttempts || err.message.includes('Publish Error') || err.message.includes('Processing Failed')) {
        throw err;
      }
      console.warn(`⚠️ Temporary error checking container status: ${err.message}. Retrying...`);
    }
  }

  throw new Error(`Meta video processing timed out after 3 minutes for container ${containerId}.`);
}
