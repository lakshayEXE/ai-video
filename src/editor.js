import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Generates approximate SRT subtitles based on script text length & timing.
 * Groups into 3-word caption blocks for fast-paced vertical video feel.
 * @param {string} scriptText - Complete script text
 * @param {number} totalDurationSeconds - Estimated video duration in seconds
 * @returns {string} Formatted SRT text content
 */
export function generateSRT(scriptText, totalDurationSeconds = 40) {
  const words = scriptText.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords === 0) return '';

  const timePerWord = totalDurationSeconds / totalWords;

  let srtContent = '';
  let index = 1;
  let currentTime = 0;

  let i = 0;
  while (i < words.length) {
    // Randomly choose 1 or 2 words per chunk for dynamic pacing
    const chunkLength = Math.random() > 0.5 ? 2 : 1;
    const chunkWords = words.slice(i, i + chunkLength);
    const chunkText = chunkWords.join(' ');
    
    const startTime = formatSRTTime(currentTime);
    currentTime += timePerWord * chunkWords.length;
    const endTime = formatSRTTime(currentTime);

    srtContent += `${index}\n${startTime} --> ${endTime}\n${chunkText}\n\n`;
    index++;
    i += chunkLength;
  }
  return srtContent;
}

function formatSRTTime(seconds) {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  return date.toISOString().substring(11, 23).replace('.', ',');
}

async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    return parseFloat(stdout.trim());
  } catch (err) {
    console.warn('⚠️ Could not determine exact audio duration, falling back to 40 seconds.');
    return 40;
  }
}

/**
 * Merges raw avatar video with audio, crops to 9:16 vertical, and burns styled subtitles.
 * @param {string[]} rawVideoPaths - Input raw video file paths
 * @param {string} audioPath - Input audio file path
 * @param {string} scriptText - Script text for SRT creation
 * @param {string} outputPath - Target final video path
 * @returns {Promise<string>}
 */
export async function processFinalVideo(rawVideoPaths, audioPath, scriptText, outputPath) {
  const tmpDir = path.resolve('./tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Fallback to array if single string passed
  if (!Array.isArray(rawVideoPaths)) {
    rawVideoPaths = [rawVideoPaths];
  }

  const srtPath = path.join(tmpDir, 'captions.srt');

  // Determine exact audio duration for perfect caption sync
  const exactDuration = await getAudioDuration(audioPath);
  console.log(`⏱️ Audio duration calculated as ${exactDuration.toFixed(2)} seconds. Syncing captions...`);

  // Generate mapped SRT captions (1-2 words per line)
  const srtData = generateSRT(scriptText, exactDuration);
  fs.writeFileSync(srtPath, srtData);
  const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Build FFmpeg Inputs
  let ffmpegCmd = 'ffmpeg -y ';
  for (const p of rawVideoPaths) {
    ffmpegCmd += `-i "${p}" `;
  }
  ffmpegCmd += `-i "${audioPath}" `; // The audio is the last input (index N)

  // Build Complex Filter for Fast Cuts (Trim to 7 seconds each = 42 seconds total)
  let filterComplex = '-filter_complex "';
  let concatInputs = '';
  
  for (let i = 0; i < rawVideoPaths.length; i++) {
    // Crop/Scale to exactly 1080x1920, trim to 7 seconds for fast cuts, fix SAR and timestamps
    filterComplex += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=7,setpts=PTS-STARTPTS[v${i}]; `;
    concatInputs += `[v${i}]`;
  }
  
  const audioIndex = rawVideoPaths.length;
  filterComplex += `${concatInputs}concat=n=${rawVideoPaths.length}:v=1:a=0[concat_out]; `;
  
  // Apply dark overlay and Hormozi-style captions (Border=4, BackColour)
  const subtitleStyle = `FontSize=28,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=4,BackColour=&H80000000,Bold=-1,MarginV=50`;
  filterComplex += `[concat_out]eq=brightness=-0.3,subtitles='${escapedSrtPath}':force_style='${subtitleStyle}'[final_v]" `;

  // Map final video and original audio, end exactly when audio ends
  ffmpegCmd += `${filterComplex} -map "[final_v]" -map ${audioIndex}:a -c:v libx264 -c:a aac -shortest "${outputPath}"`;

  console.log('🎬 Executing FFmpeg video stitching & dynamic subtitle burn...');
  await execPromise(ffmpegCmd);
  console.log(`✅ Final video rendered -> ${outputPath}`);
  return outputPath;
}
