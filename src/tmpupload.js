import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

/**
 * Uploads a local file to catbox.moe (free, direct file hosting).
 * Returns a direct public URL to the raw .mp4 file that Instagram API can download.
 * @param {string} filePath - Absolute path to local video file
 * @returns {Promise<string>} Direct public URL to the video
 */
export async function uploadToTmpFiles(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log('☁️ Uploading video to catbox.moe for public Instagram access...');
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  try {
    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: {
        ...form.getHeaders()
      },
      responseType: 'text'
    });

    const directUrl = response.data.trim();
    
    if (directUrl.startsWith('https://')) {
      console.log(`✅ Upload complete! Direct URL: ${directUrl}`);
      return directUrl;
    } else {
      throw new Error(`Catbox upload failed: ${directUrl}`);
    }
  } catch (error) {
    console.error('❌ Failed to upload video to temporary host:', error.message);
    throw error;
  }
}
