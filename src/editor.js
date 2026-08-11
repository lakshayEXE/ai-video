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

  // Add Visual Hook Banner for first 3.5 seconds
  const hookWords = words.slice(0, 7).join(' ').toUpperCase();
  srtContent += `${index}\n00:00:00,000 --> 00:00:03,500\n${hookWords}\n\n`;
  index++;

  let i = 0;
  while (i < words.length) {
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
 * Merges raw B-Roll clips with audio, crops to 9:16 vertical, and burns styled subtitles with HD bitrate settings.
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

  if (!Array.isArray(rawVideoPaths)) {
    rawVideoPaths = [rawVideoPaths];
  }

  const srtPath = path.join(tmpDir, 'captions.srt');

  const exactDuration = await getAudioDuration(audioPath);
  console.log(`⏱️ Audio duration calculated as ${exactDuration.toFixed(2)} seconds. Syncing captions...`);

  const srtData = generateSRT(scriptText, exactDuration);
  fs.writeFileSync(srtPath, srtData);
  const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Build FFmpeg Inputs
  let ffmpegCmd = 'ffmpeg -y ';
  for (const p of rawVideoPaths) {
    ffmpegCmd += `-i "${p}" `;
  }
  ffmpegCmd += `-i "${audioPath}" `;

  // Check for optional background music track (assets/bg_music.mp3)
  const bgMusicPath = path.resolve('./assets/bg_music.mp3');
  const hasBgMusic = fs.existsSync(bgMusicPath);

  if (hasBgMusic) {
    ffmpegCmd += `-i "${bgMusicPath}" `;
  }

  // Build Complex Filter for Fast Cuts (Trim to 3 seconds per clip for dynamic engagement)
  let filterComplex = '-filter_complex "';
  let concatInputs = '';
  
  for (let i = 0; i < rawVideoPaths.length; i++) {
    filterComplex += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=3,setpts=PTS-STARTPTS[v${i}]; `;
    concatInputs += `[v${i}]`;
  }
  
  const voiceIndex = rawVideoPaths.length;
  filterComplex += `${concatInputs}concat=n=${rawVideoPaths.length}:v=1:a=0[concat_out]; `;
  
  // High-contrast subtitle style positioned in upper-middle zone (MarginV=280) to avoid Instagram UI overlap
  const subtitleStyle = `FontSize=28,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=4,BackColour=&H80000000,Bold=-1,Alignment=2,MarginV=280`;
  filterComplex += `[concat_out]subtitles='${escapedSrtPath}':force_style='${subtitleStyle}'[final_v]; `;

  if (hasBgMusic) {
    const bgIndex = rawVideoPaths.length + 1;
    filterComplex += `[${voiceIndex}:a]volume=1.0[voice]; [${bgIndex}:a]volume=0.10[bg]; [voice][bg]amix=inputs=2:duration=first[final_a]" `;
    ffmpegCmd += `${filterComplex} -map "[final_v]" -map "[final_a]" -c:v libx264 -preset fast -crf 18 -b:v 8M -c:a aac -b:a 192k -shortest "${outputPath}"`;
  } else {
    filterComplex = filterComplex.slice(0, -2) + '" ';
    ffmpegCmd += `${filterComplex} -map "[final_v]" -map ${voiceIndex}:a -c:v libx264 -preset fast -crf 18 -b:v 8M -c:a aac -b:a 192k -shortest "${outputPath}"`;
  }

  console.log('🎬 Executing High-Bitrate FFmpeg video stitching with audio mixing & dynamic caption burn...');
  await execPromise(ffmpegCmd);
  console.log(`✅ HD Final video rendered -> ${outputPath}`);
  return outputPath;
}
