import axios from 'axios';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'assets', 'broll_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Searches Pexels for vertical videos with persistent local caching and dark-tech fallback.
 * @param {string} query - The search term (e.g., "cyberpunk glowing AI core, code screen").
 * @param {number} count - Number of clips needed.
 * @param {string} outputDir - Directory to save target clips for FFmpeg.
 * @returns {Promise<string[]>} Array of paths to downloaded/cached MP4 clips.
 */
export async function downloadMultiplePexelsVideos(query, count, outputDir) {
  const apiKey = process.env.PEXELS_API_KEY;

  const subQueries = query.split(',').map(q => q.trim()).filter(Boolean);
  const perQueryCount = Math.max(1, Math.ceil(count / subQueries.length));

  console.log(`🔎 Searching Pexels with Cache for vertical videos across terms: ${JSON.stringify(subQueries)}...`);

  // Check if we have enough cached clips matching this query theme
  const cachedClips = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.mp4'));
  if (!apiKey && cachedClips.length >= count) {
    console.log(`⚡ Offline/No-API mode: Reusing ${count} cached high-bitrate B-roll clips!`);
    return cachedClips.slice(0, count).map((file, idx) => {
      const src = path.join(CACHE_DIR, file);
      const dest = path.join(outputDir, `clip_${idx}.mp4`);
      fs.copyFileSync(src, dest);
      return dest;
    });
  }

  try {
    let allVideos = [];

    if (apiKey) {
      for (const q of subQueries) {
        try {
          const searchRes = await axios.get('https://api.pexels.com/videos/search', {
            headers: { Authorization: apiKey },
            params: {
              query: q,
              orientation: 'portrait',
              size: 'large',
              per_page: 15
            }
          });

          if (searchRes.data.videos && searchRes.data.videos.length > 0) {
            const picked = searchRes.data.videos.sort(() => 0.5 - Math.random()).slice(0, perQueryCount);
            allVideos.push(...picked);
          }
        } catch (err) {
          console.warn(`⚠️ Warning: Pexels query "${q}" failed:`, err.message);
        }
      }
    }

    // Fallback search if empty
    if (allVideos.length === 0 && apiKey) {
      console.log('⚠️ Fallback: Fetching high-aesthetic dark tech B-roll from Pexels...');
      try {
        const searchRes = await axios.get('https://api.pexels.com/videos/search', {
          headers: { Authorization: apiKey },
          params: { query: 'cyberpunk technology AI', orientation: 'portrait', size: 'large', per_page: count }
        });
        if (searchRes.data && searchRes.data.videos) {
          allVideos = searchRes.data.videos.slice(0, count);
        }
      } catch (err) {
        console.warn('⚠️ Primary & Fallback Pexels search failed:', err.message);
      }
    }

    // If API failed or returned 0 videos, reuse local cache
    if (allVideos.length === 0 && cachedClips.length > 0) {
      console.log(`📦 Reusing ${count} cached high-bitrate clips from assets/broll_cache/...`);
      const selectedCached = cachedClips.sort(() => 0.5 - Math.random()).slice(0, count);
      return selectedCached.map((file, idx) => {
        const srcPath = path.join(CACHE_DIR, file);
        const destPath = path.join(outputDir, `clip_${idx}.mp4`);
        fs.copyFileSync(srcPath, destPath);
        return destPath;
      });
    }

    const selectedVideos = allVideos.slice(0, count);
    console.log(`📥 Found ${selectedVideos.length} diverse B-roll clips! Downloading to cache & workspace...`);

    const downloadPromises = selectedVideos.map(async (video, index) => {
      let videoFile = video.video_files.find(f => f.height >= 1080 && f.width >= 720);
      if (!videoFile) {
        videoFile = video.video_files.reduce((prev, current) => (prev.width > current.width) ? prev : current);
      }

      const cachePath = path.join(CACHE_DIR, `pexels_${video.id}.mp4`);
      const outputPath = path.join(outputDir, `clip_${index}.mp4`);

      // If already cached, reuse immediately!
      if (fs.existsSync(cachePath)) {
        console.log(`⚡ Cache Hit for video ID ${video.id}! Copying...`);
        fs.copyFileSync(cachePath, outputPath);
        return outputPath;
      }

      const downloadRes = await axios({
        method: 'GET',
        url: videoFile.link,
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        const cacheWriter = fs.createWriteStream(cachePath);
        downloadRes.data.pipe(cacheWriter);
        cacheWriter.on('finish', () => {
          fs.copyFileSync(cachePath, outputPath);
          resolve(outputPath);
        });
        cacheWriter.on('error', reject);
      });
    });

    const downloadedPaths = await Promise.all(downloadPromises);
    return downloadedPaths;

  } catch (error) {
    console.error(`❌ Pexels Download Error:`, error.message);
    throw error;
  }
}
