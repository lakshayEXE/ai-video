import fs from 'fs';
import path from 'path';

/**
 * Sends audio file to Colab GPU endpoint and receives rendered MP4 avatar video.
 * @param {string} audioPath - Local path to audio file
 * @param {string} rawVideoPath - Path to save returned MP4 video
 * @returns {Promise<string>}
 */
export async function renderAvatarFromColab(audioPath, rawVideoPath) {
  const colabUrl = process.env.COLAB_WEBHOOK_URL;
  if (!colabUrl) {
    throw new Error('COLAB_WEBHOOK_URL environment variable is missing.');
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found at path: ${audioPath}`);
  }

  const dir = path.dirname(rawVideoPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`📡 Sending audio to Colab GPU endpoint: ${colabUrl}`);

  const fileBuffer = fs.readFileSync(audioPath);
  const file = new File([fileBuffer], path.basename(audioPath), { type: 'audio/wav' });

  const formData = new FormData();
  formData.append('audio', file);


  const response = await fetch(colabUrl, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(600000)
  });



  const rawLog = response.headers.get('x-render-log');
  const renderLog = rawLog ? decodeURIComponent(rawLog) : 'No diagnostic header returned from Colab.';
  console.log(`📊 GPU Render Log: ${renderLog}`);


  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Colab GPU Rendering failed (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const videoBuffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(rawVideoPath, videoBuffer);

  console.log(`✅ Received raw avatar video (${videoBuffer.length} bytes) -> ${rawVideoPath}`);
  return { rawVideoPath, renderLog };
}


