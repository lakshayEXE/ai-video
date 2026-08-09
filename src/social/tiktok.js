import fs from 'fs';

/**
 * Uploads video to TikTok using the Content Posting API.
 * @param {string} videoPath - Absolute or relative path to MP4 video
 * @param {string} title - Video caption / title
 * @returns {Promise<object>} Result response from TikTok API
 */
export async function uploadToTikTok(videoPath, title) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('⚠️ TIKTOK_ACCESS_TOKEN missing. Skipping TikTok upload.');
    return { skipped: true, reason: 'Missing TIKTOK_ACCESS_TOKEN environment variable.' };
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`TikTok upload error: Video file does not exist at ${videoPath}`);
  }

  const stats = fs.statSync(videoPath);
  const fileSize = stats.size;

  console.log(`📤 Initializing TikTok Video Upload: "${title}" (${fileSize} bytes)...`);

  // Step 1: Initialize Video Post
  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      post_info: {
        title: title.substring(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: fileSize,
        total_chunk_count: 1
      }
    })
  });

  const initData = await initRes.json();

  if (initData.error && initData.error.code !== 'ok') {
    throw new Error(`TikTok Init Error: ${JSON.stringify(initData.error)}`);
  }

  const uploadUrl = initData.data?.upload_url;
  const publishId = initData.data?.publish_id;

  if (!uploadUrl) {
    throw new Error(`TikTok API did not return upload URL: ${JSON.stringify(initData)}`);
  }

  // Step 2: Upload Video File Stream
  console.log('📤 Uploading binary video chunk to TikTok...');
  const videoBuffer = fs.readFileSync(videoPath);

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': fileSize.toString(),
      'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`
    },
    body: videoBuffer
  });

  if (!uploadRes.ok) {
    throw new Error(`TikTok Chunk Upload Failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }

  console.log(`✅ TikTok Upload Successful! Publish ID: ${publishId}`);
  return { success: true, publishId };
}
