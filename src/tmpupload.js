import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

/**
 * Uploads a local file to tmpfiles.org (free, no API key needed, 1hr expiration).
 * Returns a direct public URL to the raw .mp4 file that Instagram API can download.
 * @param {string} filePath - Absolute path to local video file
 * @returns {Promise<string>} Direct public URL to the video
 */
export async function uploadToTmpFiles(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log('☁️ Uploading video to tmpfiles.org for public Instagram access...');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    if (response.data && response.data.status === 'success') {
      // The API returns the viewer URL: https://tmpfiles.org/12345/video.mp4
      // We must inject "/dl/" to get the raw direct link for Instagram Graph API
      const viewerUrl = response.data.data.url;
      const directUrl = viewerUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      
      console.log(`✅ Upload complete! Direct URL: ${directUrl}`);
      return directUrl;
    } else {
      throw new Error(`tmpfiles.org upload failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Failed to upload video to temporary host:', error.message);
    throw error;
  }
}
