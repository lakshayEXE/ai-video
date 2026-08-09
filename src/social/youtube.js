import { google } from 'googleapis';
import fs from 'fs';

function getYouTubeClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YouTube OAuth2 environment credentials (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN).');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.youtube({ version: 'v3', auth: oauth2Client });
}

/**
 * Uploads video file to YouTube Shorts.
 * @param {string} videoPath - Absolute or relative path to MP4 video file
 * @param {string} title - Video title
 * @returns {Promise<string>} Uploaded YouTube Video ID
 */
export async function uploadToYouTube(videoPath, title) {
  const youtube = getYouTubeClient();

  if (!fs.existsSync(videoPath)) {
    throw new Error(`YouTube upload error: File does not exist at ${videoPath}`);
  }

  console.log(`📤 Uploading video to YouTube Shorts: "${title}"...`);
  
  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: `${title.substring(0, 80)} #Shorts`,
        description: `${title}\n\n#tech #ai #news`,
        categoryId: '28' // Science & Technology
      },
      status: { privacyStatus: 'public' }
    },
    media: {
      body: fs.createReadStream(videoPath)
    }
  });

  console.log(`✅ Uploaded to YouTube Shorts! Video ID: ${res.data.id}`);
  return res.data.id;
}
