import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

/**
 * Uploads a local file to uguu.se (free, direct file hosting).
 * Returns a direct public URL to the raw .mp4 file that Instagram API can download.
 * @param {string} filePath - Absolute path to local video file
 * @returns {Promise<string>} Direct public URL to the video
 */
export async function uploadToTmpFiles(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log('☁️ Uploading video to uguu.se for public Instagram access...');
  const form = new FormData();
  form.append('files[]', fs.createReadStream(filePath));

  try {
    const response = await axios.post('https://uguu.se/upload.php', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    if (response.data && response.data.success) {
      const directUrl = response.data.files[0].url;
      console.log(`✅ Upload complete! Direct URL: ${directUrl}`);
      return directUrl;
    } else {
      throw new Error(`uguu.se upload failed: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Failed to upload video to temporary host:', error.message);
    throw error;
  }
}

