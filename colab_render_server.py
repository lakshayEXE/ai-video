# ==============================================================================
# AI Influencer Engine - Google Colab GPU Rendering Server (HD SADTALKER FIX)
# ==============================================================================
# RUN THIS IN YOUR GOOGLE COLAB INSTANCE WITH GPU RUNTIME (T4)
#
# STEP 1: Run this EXACT code in a cell to downgrade to Python 3.10 and install SadTalker:
# !apt-get install python3.10 python3.10-distutils
# !wget https://bootstrap.pypa.io/get-pip.py
# !python3.10 get-pip.py
# !git clone https://github.com/OpenTalker/SadTalker.git
# %cd SadTalker
# !python3.10 -m pip install torch torchvision torchaudio
# !python3.10 -m pip install -r requirements.txt
# !bash scripts/download_models.sh
# !python3.10 -m pip install fastapi uvicorn pyngrok python-multipart nest-asyncio
#
# STEP 2: Drag and drop avatar.png into Colab Files sidebar
# ==============================================================================


from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from pyngrok import ngrok
import uvicorn
import shutil
import os
import nest_asyncio

nest_asyncio.apply()

app = FastAPI(title="LivePortrait Colab GPU Server")

import subprocess


def find_avatar_image():
    search_dirs = [".", "..", "/content"]
    # 1. Search for files starting with 'avatar'
    for d in search_dirs:
        if os.path.exists(d):
            try:
                for f in os.listdir(d):
                    if f.lower().startswith("avatar") and f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                        return os.path.join(d, f)
            except Exception:
                pass
    # 2. Search for any image file
    for d in search_dirs:
        if os.path.exists(d):
            try:
                for f in os.listdir(d):
                    if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")) and not f.startswith("."):
                        return os.path.join(d, f)
            except Exception:
                pass
    return None


def find_inference_script():
    possible_paths = [
        "Wav2Lip/inference.py",
        "/content/Wav2Lip/inference.py",
        "speed_inference.py",
        "inference.py",
        "run.py",
        "LivePortrait/speed_inference.py",
        "LivePortrait/inference.py",
        "SadTalker/inference.py",
        "/content/LivePortrait/speed_inference.py",
        "/content/LivePortrait/inference.py",
        "/content/SadTalker/inference.py"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return None

def run_liveportrait_inference(audio_path, output_mp4_path):
    logs = []
    def log(msg):
        print(msg)
        logs.append(str(msg))

    source_avatar = find_avatar_image()
    script_path = find_inference_script()
    log(f"🔍 Avatar Search Result: {source_avatar}")
    log(f"🤖 AI Lip-Sync Script Result: {script_path}")
    log(f"📂 Colab Directory: {os.getcwd()}")
    
    # Remove old rendered video if present to force fresh rendering
    if os.path.exists(output_mp4_path):
        try:
            os.remove(output_mp4_path)
        except Exception:
            pass

    # 1. Execute AI Lip-Sync Engine (LivePortrait, SadTalker, or Wav2Lip)
    if source_avatar and os.path.exists(source_avatar) and script_path:
        script_dir = os.path.dirname(script_path)
        script_name = os.path.basename(script_path)
        
        original_cwd = os.getcwd()
        if script_dir and script_dir != ".":
            os.chdir(script_dir)
            abs_avatar = os.path.abspath(os.path.join(original_cwd, source_avatar))
            abs_audio = os.path.abspath(os.path.join(original_cwd, audio_path))
            abs_out = os.path.abspath(os.path.join(original_cwd, output_mp4_path))
        else:
            abs_avatar = os.path.abspath(source_avatar)
            abs_audio = os.path.abspath(audio_path)
            abs_out = os.path.abspath(output_mp4_path)

        # Auto-download LivePortrait checkpoints if missing (only if using LivePortrait)
        if "LivePortrait" in script_path and not os.path.exists("checkpoints"):
            log("📥 Downloading LivePortrait GPU Model Checkpoints from HuggingFace...")
            os.system("huggingface-cli download KwaiVGI/LivePortrait --local-dir checkpoints")

        log(f"🎭 EXECUTING AI LIP-SYNC INFERENCE on GPU using script: '{script_name}'...")
        
        # Select correct commands based on the detected AI engine
        abs_script_path = os.path.abspath(script_path)
        if "SadTalker" in abs_script_path or "SadTalker" in os.getcwd() or "sadtalker" in script_name.lower():
            commands = [
                ["python3.10", script_name, "--source_image", abs_avatar, "--driven_audio", abs_audio, "--result_dir", ".", "--still", "--preprocess", "full"],
                ["python3.10", script_name, "--source_image", abs_avatar, "--driven_audio", abs_audio, "--result_dir", ".", "--still"]
            ]
        elif "Wav2Lip" in abs_script_path or "Wav2Lip" in os.getcwd() or "wav2lip" in script_name.lower():
            commands = [
                ["python", script_name, "--checkpoint_path", "checkpoints/wav2lip_gan.pth", "--face", abs_avatar, "--audio", abs_audio, "--outfile", abs_out],
                ["python", script_name, "--checkpoint_path", "checkpoints/wav2lip.pth", "--face", abs_avatar, "--audio", abs_audio, "--outfile", abs_out]
            ]
        else:
            # Default to LivePortrait
            commands = [
                ["python", script_name, "-s", abs_avatar, "-d", abs_audio, "-o", abs_out],
                ["python", script_name, "--source", abs_avatar, "--driving", abs_audio, "--output_dir", "."],
                ["python", script_name, "--source_image", abs_avatar, "--driving_audio", abs_audio, "--output_dir", "."]
            ]
        
        for idx, cmd in enumerate(commands):
            log(f"🚀 Trying Command #{idx+1}: {' '.join(cmd)}")
            res = subprocess.run(cmd, capture_output=True, text=True)
            if os.path.exists(abs_out) and os.path.getsize(abs_out) > 10000:
                log(f"✨ SUCCESS! REAL AI LIP-SYNC VIDEO GENERATED! Size: {os.path.getsize(abs_out)} bytes")
                os.chdir(original_cwd)
                return logs
            
            for result_file in os.listdir("."):
                if result_file.endswith(".mp4") and os.path.getsize(result_file) > 10000 and result_file != os.path.basename(abs_out):
                    shutil.copy(result_file, abs_out)
                    log(f"✨ SUCCESS! REAL AI LIP-SYNC VIDEO GENERATED ({result_file})! Size: {os.path.getsize(abs_out)} bytes")
                    os.chdir(original_cwd)
                    return logs
                    
            if res.stderr:
                log(f"⚠️ Command #{idx+1} Error: {res.stderr[:250]}")
            if res.stdout:
                log(f"ℹ️ Command #{idx+1} Output: {res.stdout[:250]}")
                
        os.chdir(original_cwd)

    # 2. Fallback: Render avatar video using FFmpeg scaled to 9:16 vertical (1080x1920)
    if source_avatar and os.path.exists(source_avatar):
        log(f"🎬 RENDERING STILL AVATAR VIDEO FALLBACK using image: '{source_avatar}'...")
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", source_avatar,
            "-i", audio_path,
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-shortest",
            output_mp4_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(output_mp4_path) and os.path.getsize(output_mp4_path) > 10000:
            log(f"⚠️ FALLBACK RENDERED! Still image video created ({os.path.getsize(output_mp4_path)} bytes)")
            return logs
        else:
            log(f"❌ FFmpeg Fallback Error: {result.stderr[:250]}")

    if os.path.exists("source_avatar_base.mp4"):
        shutil.copy("source_avatar_base.mp4", output_mp4_path)
    else:
        log("⚠️ No avatar image found! Generating black fallback background...")
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=5",
            "-i", audio_path,
            "-c:v", "libx264", "-c:a", "aac", "-shortest",
            output_mp4_path
        ]
        subprocess.run(cmd, capture_output=True, text=True)

    return logs


@app.post("/render")
async def render_avatar(audio: UploadFile = File(...)):
    temp_audio_path = f"temp_{audio.filename}"
    output_video_path = "rendered_avatar.mp4"
    
    # Save incoming audio file
    with open(temp_audio_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
        
    # Execute avatar rendering inference and capture logs
    logs = run_liveportrait_inference(temp_audio_path, output_video_path)
    
    # Cleanup temp audio
    if os.path.exists(temp_audio_path):
        os.remove(temp_audio_path)
        
    response = FileResponse(output_video_path, media_type="video/mp4", filename="avatar.mp4")
    
    # Safely URL encode the logs because HTTP headers crash on Emojis/UTF-8!
    import urllib.parse
    clean_logs = " | ".join([l.replace('\n', ' ') for l in logs])[-1500:]
    response.headers["X-Render-Log"] = urllib.parse.quote(clean_logs)
    
    return response


# ==============================================================================
# SET YOUR NGROK AUTH TOKEN HERE (Free from https://dashboard.ngrok.com/get-started/your-authtoken)
# ==============================================================================
NGROK_AUTH_TOKEN = "3HfvIihSQy8FzCkaPsag41fFDnU_6CeuHfVm9LbVXNtooBQih"

import threading

if __name__ == "__main__":
    if NGROK_AUTH_TOKEN:
        ngrok.set_auth_token(NGROK_AUTH_TOKEN)

    # Disconnect any existing ngrok processes before opening a new tunnel
    try:
        ngrok.kill()
    except Exception:
        pass

    public_url = ngrok.connect(8000)

    print("=" * 60)
    print(f"🚀 COLAB GPU ENDPOINT LIVE AT: {public_url.public_url}/render")
    print(f"👉 Copy '{public_url.public_url}/render' into your local .env as COLAB_WEBHOOK_URL")
    print("=" * 60)

    # Run Uvicorn in a daemon thread to prevent Jupyter event loop conflict in Python 3.12
    server_thread = threading.Thread(target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000), daemon=True)
    server_thread.start()
    print("✨ Colab GPU Server running continuously in background!")


