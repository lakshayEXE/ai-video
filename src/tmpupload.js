import fs from 'fs';
import axios from 'axios';

/**
 * Uploads a local file to transfer.sh (free, direct file hosting).
 * Returns a direct public URL to the raw .mp4 file that Instagram API can download.
 * @param {string} filePath - Absolute path to local video file
 * @returns {Promise<string>} Direct public URL to the video
 */
export async function uploadToTmpFiles(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log('☁️ Uploading video to transfer.sh for public Instagram access...');

  try {
    const stream = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);
    
    // HTTP PUT directly to transfer.sh
    const response = await axios.put('https://transfer.sh/video.mp4', stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stats.size
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const directUrl = response.data.trim();
    
    if (directUrl.startsWith('https://')) {
      // transfer.sh returns a URL like: https://transfer.sh/XXXXXX/video.mp4
      console.log(`✅ Upload complete! Direct URL: ${directUrl}`);
      return directUrl;
    } else {
      throw new Error(`transfer.sh upload failed: ${directUrl}`);
    }
  } catch (error) {
    console.error('❌ Failed to upload video to temporary host:', error.message);
    throw error;
  }
}
