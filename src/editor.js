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
/**
 * Generates approximate SRT subtitles based on script text length & timing.
 * Groups into 2-3 word caption blocks for fast-paced vertical video feel.
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
    // 1 to 2 words per caption chunk for ultra-fast, high-dopamine kinetic retention
    const chunkLength = (i % 3 === 0) ? 1 : 2;
    const chunkWords = words.slice(i, i + chunkLength);
    const chunkText = chunkWords.join(' ').toUpperCase();
    
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
    const dur = parseFloat(stdout.trim());
    return (isNaN(dur) || dur <= 0) ? 40 : dur;
  } catch (err) {
    console.warn('⚠️ Could not determine exact audio duration, falling back to 40 seconds.');
    return 40;
  }
}

/**
 * Merges raw B-Roll clips with audio, crops to 9:16 vertical, and burns agency kinetic captions with HD settings.
 */
export async function processFinalVideo(rawVideoPaths, audioPath, scriptText, outputPath) {
  const tmpDir = path.resolve('./tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  if (!Array.isArray(rawVideoPaths) || rawVideoPaths.length === 0) {
    throw new Error('No raw video paths provided for video processing.');
  }

  const srtPath = path.join(tmpDir, 'captions.srt');

  const exactDuration = await getAudioDuration(audioPath);
  console.log(`⏱️ Audio duration calculated as ${exactDuration.toFixed(2)} seconds. Generating Hormozi-style kinetic captions...`);

  const srtData = generateSRT(scriptText, exactDuration);
  fs.writeFileSync(srtPath, srtData);
  const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // Fast-paced agency cuts: max 2.5 seconds per B-roll clip for high viewer retention
  const targetClipLength = 2.5;
  const numClipsNeeded = Math.ceil(exactDuration / targetClipLength);
  const availableClips = rawVideoPaths.slice(0, Math.min(rawVideoPaths.length, numClipsNeeded));
  const numClips = availableClips.length;
  const clipDuration = (exactDuration / numClips) + 0.15;

  // Build FFmpeg Inputs
  let ffmpegCmd = 'ffmpeg -y ';
  for (const p of availableClips) {
    ffmpegCmd += `-i "${p}" `;
  }
  ffmpegCmd += `-i "${audioPath}" `;

  // Check for background music track
  const bgMusicPath = path.resolve('./assets/bg_music.mp3');
  const hasBgMusic = fs.existsSync(bgMusicPath);

  if (hasBgMusic) {
    ffmpegCmd += `-i "${bgMusicPath}" `;
  }

  // Build Complex Filter with Dynamic Ken Burns Motion
  let filterComplex = '-filter_complex "';
  let concatInputs = '';
  
  for (let i = 0; i < numClips; i++) {
    const motionIndex = i % 4;
    let zoomExpr = "min(zoom+0.0025,1.20)";
    if (motionIndex === 1) zoomExpr = "max(1.20-0.0025*on,1.0)";
    if (motionIndex === 2) zoomExpr = "min(zoom+0.002,1.15)";
    if (motionIndex === 3) zoomExpr = "max(1.15-0.002*on,1.0)";

    filterComplex += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=100:s=1080x1920,trim=duration=${clipDuration.toFixed(2)},setpts=PTS-STARTPTS[v${i}]; `;
    concatInputs += `[v${i}]`;
  }
  
  const voiceIndex = numClips;
  filterComplex += `${concatInputs}concat=n=${numClips}:v=1:a=0[concat_out]; `;
  
  // Agency Kinetic Subtitles: Large, bold neon yellow with heavy black outline & drop shadow at center-lower screen
  const subtitleStyle = `FontName=Arial,FontSize=32,PrimaryColour=&H00FFFF,OutlineColour=&H000000,BorderStyle=1,Outline=4,Shadow=3,Bold=1,Alignment=2,MarginV=180`;
  filterComplex += `[concat_out]subtitles='${escapedSrtPath}':force_style='${subtitleStyle}'[sub_out]; `;

  // Agency Executive Top Header Banner
  const categoryBanner = `drawtext=text='⚡ AI.MAXXING_  •  AI BREAKTHROUGH':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=120:box=1:boxcolor=0x0B0F17@0.85:boxborderw=12`;
  filterComplex += `[sub_out]${categoryBanner}[final_v]; `;

  if (hasBgMusic) {
    const bgIndex = numClips + 1;
    filterComplex += `[${voiceIndex}:a]loudnorm=I=-16:TP=-1.5:LRA=11[voice]; [${bgIndex}:a]volume=0.12[bg]; [voice][bg]amix=inputs=2:duration=first[final_a]" `;
    ffmpegCmd += `${filterComplex} -map "[final_v]" -map "[final_a]" -c:v libx264 -preset fast -crf 18 -b:v 8M -c:a aac -b:a 192k -shortest "${outputPath}"`;
  } else {
    filterComplex += `[${voiceIndex}:a]loudnorm=I=-16:TP=-1.5:LRA=11[final_a]" `;
    ffmpegCmd += `${filterComplex} -map "[final_v]" -map "[final_a]" -c:v libx264 -preset fast -crf 18 -b:v 8M -c:a aac -b:a 192k -shortest "${outputPath}"`;
  }

  console.log('🎬 Executing High-Bitrate FFmpeg video stitching with audio mixing & dynamic caption burn...');
  await execPromise(ffmpegCmd);
  console.log(`✅ HD Final video rendered -> ${outputPath}`);
  return outputPath;
}
