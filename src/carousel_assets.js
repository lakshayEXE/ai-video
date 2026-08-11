import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Fetches high-quality dark tech photos or returns procedural SVG graphics.
 * @param {string} prompt - Query or description for the visual asset
 * @param {string} outputPath - Path to save the image asset
 * @returns {Promise<string|null>} Path to saved image or null if fallback
 */
export async function getSlideVisualAsset(prompt, outputPath) {
  const apiKey = process.env.PEXELS_API_KEY;

  if (apiKey) {
    try {
      // Search Pexels photo API for portrait/vertical HD image
      const searchRes = await axios.get('https://api.pexels.com/v1/search', {
        headers: { Authorization: apiKey },
        params: {
          query: prompt || 'abstract dark technology minimalist',
          orientation: 'portrait',
          per_page: 5
        }
      });

      if (searchRes.data && searchRes.data.photos && searchRes.data.photos.length > 0) {
        const photo = searchRes.data.photos[Math.floor(Math.random() * searchRes.data.photos.length)];
        const imageUrl = photo.src.large2x || photo.src.large || photo.src.medium;

        const downloadRes = await axios({
          method: 'GET',
          url: imageUrl,
          responseType: 'stream'
        });

        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(outputPath);
          downloadRes.data.pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        return outputPath;
      }
    } catch (err) {
      console.warn(`⚠️ Warning: Pexels photo search failed for "${prompt}":`, err.message);
    }
  }

  return null;
}
