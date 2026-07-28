"""
Local TTS microservice wrapping AI4Bharat's IndicF5 model — same pattern as
Ollama serving the LLM: a small always-on local process the Java backend
calls over HTTP, so LucienAgentLoop/LlamaClient don't need to embed Python.

Supports exactly the 4 languages Lucien needs to speak: Hindi, Tamil,
Kannada, Malayalam. Each is driven by a reference voice clip + its transcript
(F5-TTS style voice cloning) — IndicF5's own official demo cross-lingually
pairs a Punjabi reference with Hindi text and a Tamil reference with
Malayalam text, since no dedicated Hindi/Malayalam reference clip ships with
the model; we reuse those exact pairings here.

Run: .venv/Scripts/python.exe -m uvicorn app:app --host 127.0.0.1 --port 8100
"""
import io
import os
from pathlib import Path

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from transformers import AutoModel

BASE_DIR = Path(__file__).parent
PROMPTS_DIR = BASE_DIR / "prompts"
SAMPLE_RATE = 24000

LANG_PROMPTS = {
    "hi": {
        "ref_audio": PROMPTS_DIR / "PAN_F_HAPPY_00002.wav",
        "ref_text": "ਇੱਕ ਗ੍ਰਾਹਕ ਨੇ ਸਾਡੀ ਬੇਮਿਸਾਲ ਸੇਵਾ ਬਾਰੇ ਦਿਲੋਂਗਵਾਹੀ ਦਿੱਤੀ ਜਿਸ ਨਾਲ ਸਾਨੂੰ ਅਨੰਦ ਮਹਿਸੂਸ ਹੋਇਆ।",
    },
    "ta": {
        "ref_audio": PROMPTS_DIR / "TAM_F_HAPPY_00001.wav",
        "ref_text": "நான் நெனச்ச மாதிரியே அமேசான்ல பெரிய தள்ளுபடி வந்திருக்கு. கம்மி காசுக்கே அந்தப் புது சேம்சங் மாடல வாங்கிடலாம்.",
    },
    "kn": {
        "ref_audio": PROMPTS_DIR / "KAN_F_HAPPY_00001.wav",
        "ref_text": "ನಮ್‌ ಫ್ರಿಜ್ಜಲ್ಲಿ  ಕೂಲಿಂಗ್‌ ಸಮಸ್ಯೆ ಆಗಿ ನಾನ್‌ ಭಾಳ ದಿನದಿಂದ ಒದ್ದಾಡ್ತಿದ್ದೆ, ಆದ್ರೆ ಅದ್ನೀಗ ಮೆಕಾನಿಕ್ ಆಗಿರೋ ನಿಮ್‌ ಸಹಾಯ್ದಿಂದ ಬಗೆಹರಿಸ್ಕೋಬೋದು ಅಂತಾಗಿ ನಿರಾಳ ಆಯ್ತು ನಂಗೆ.",
    },
    "ml": {
        # No dedicated Malayalam reference ships with the model — AI4Bharat's
        # own demo pairs Malayalam text with this same Tamil reference clip.
        "ref_audio": PROMPTS_DIR / "TAM_F_HAPPY_00001.wav",
        "ref_text": "நான் நெனச்ச மாதிரியே அமேசான்ல பெரிய தள்ளுபடி வந்திருக்கு. கம்மி காசுக்கே அந்தப் புது சேம்சங் மாடல வாங்கிடலாம்.",
    },
}

model = None


def get_model():
    global model
    if model is None:
        token = os.environ.get("HF_TOKEN")
        model = AutoModel.from_pretrained("ai4bharat/IndicF5", trust_remote_code=True, token=token)
        # The model's built-in post-processing (pydub silence-stripping + loudness
        # normalization) misfires in this environment and can wipe out perfectly
        # good audio entirely (verified: raw output was 11s of real speech, but
        # with remove_sil=True the response came back as an empty 44-byte file).
        # We do our own lightweight peak normalization instead — see normalize().
        model.config.remove_sil = False
    return model


def normalize(audio: np.ndarray, target_peak: float = 0.9) -> np.ndarray:
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio * (target_peak / peak)
    return audio


app = FastAPI(title="Lucien Indic TTS")


@app.on_event("startup")
def preload_model():
    get_model()


class SpeakRequest(BaseModel):
    text: str
    lang: str


@app.get("/health")
def health():
    return {"status": "ok", "languages": list(LANG_PROMPTS.keys()), "model_loaded": model is not None}


@app.post("/tts")
def synthesize(req: SpeakRequest):
    lang = req.lang.lower()
    if lang not in LANG_PROMPTS:
        raise HTTPException(400, f"Unsupported language '{req.lang}'. Supported: {list(LANG_PROMPTS.keys())}")
    if not req.text.strip():
        raise HTTPException(400, "text must not be empty")

    prompt = LANG_PROMPTS[lang]
    m = get_model()
    audio = m(str(req.text), ref_audio_path=str(prompt["ref_audio"]), ref_text=prompt["ref_text"])

    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    audio = normalize(np.array(audio, dtype=np.float32))

    buf = io.BytesIO()
    sf.write(buf, np.array(audio, dtype=np.float32), samplerate=SAMPLE_RATE, format="WAV")
    return Response(content=buf.getvalue(), media_type="audio/wav")
