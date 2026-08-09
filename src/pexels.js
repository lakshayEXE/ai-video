import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Searches Pexels for a vertical video based on a query and downloads it.
 * @param {string} query - The search term (e.g., "luxury cars", "rain city").
 * @param {string} outputPath - Where to save the downloaded .mp4 file.
 * @returns {Promise<string>} The path to the downloaded video.
 */
export async function downloadMultiplePexelsVideos(query, count, outputDir) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY is not defined in .env.');
  }

  console.log(`🔎 Searching Pexels for vertical video: "${query}"...`);
  
  try {
    const searchRes = await axios.get('https://api.pexels.com/videos/search', {
      headers: { Authorization: apiKey },
      params: {
        query: query,
        orientation: 'portrait',
        size: 'medium',
        per_page: 30
      }
    });

    if (searchRes.data.videos.length === 0) {
      throw new Error(`No vertical videos found on Pexels for query: "${query}"`);
    }

    // Shuffle and pick top `count` videos
    const videos = searchRes.data.videos.sort(() => 0.5 - Math.random()).slice(0, count);
    
    console.log(`📥 Found ${videos.length} clips! Downloading concurrently...`);
    
    const downloadPromises = videos.map(async (video, index) => {
      let videoFile = video.video_files.find(f => f.height >= 1080 && f.width >= 720);
      if (!videoFile) {
        videoFile = video.video_files.reduce((prev, current) => (prev.width > current.width) ? prev : current);
      }

      const outputPath = path.join(outputDir, `clip_${index}.mp4`);
      
      const downloadRes = await axios({
        method: 'GET',
        url: videoFile.link,
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outputPath);
        downloadRes.data.pipe(writer);
        writer.on('finish', () => resolve(outputPath));
        writer.on('error', reject);
      });
    });

    const downloadedPaths = await Promise.all(downloadPromises);
    return downloadedPaths;

  } catch (error) {
    console.error(`❌ Pexels API Error:`, error.response ? error.response.data : error.message);
    throw error;
  }
}
