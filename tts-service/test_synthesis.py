"""One-off synthesis smoke test — run from tts-service/ with .venv active."""
import os
import time
from pathlib import Path

# Import app first so the torchaudio soundfile patch is applied before model load.
import app  # noqa: F401

import numpy as np
import soundfile as sf
from transformers import AutoModel

PROMPTS_DIR = Path(__file__).parent / "prompts"
KN_TEXT = "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಸಾಲದ ಪಾವತಿ ಬಾಕಿ ಇದೆ. ದಯವಿಟ್ಟು ಶೀಘ್ರವಾಗಿ ಪಾವತಿಸಿ."
KN_REF = PROMPTS_DIR / "KAN_F_HAPPY_00001.wav"
KN_REF_TEXT = (
    "ನಮ್‌ ಫ್ರಿಜ್ಜಲ್ಲಿ  ಕೂಲಿಂಗ್‌ ಸಮಸ್ಯೆ ಆಗಿ ನಾನ್‌ ಭಾಳ ದಿನದಿಂದ ಒದ್ದಾಡ್ತಿದ್ದೆ, "
    "ಆದ್ರೆ ಅದ್ನೀಗ ಮೆಕಾನಿಕ್ ಆಗಿರೋ ನಿಮ್‌ ಸಹಾಯ್ದಿಂದ ಬಗೆಹರಿಸ್ಕೋಬೋದು ಅಂತಾಗಿ ನಿರಾಳ ಆಯ್ತು ನಂಗೆ."
)
EN_TEXT = "Your loan payment is overdue. Please pay as soon as possible."


def stats(audio: np.ndarray) -> str:
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio**2)))
    return f"peak={peak:.4f}, rms={rms:.4f}, duration={len(audio) / 24000:.2f}s"


def to_float(audio: np.ndarray) -> np.ndarray:
    if audio.dtype == np.int16:
        return audio.astype(np.float32) / 32768.0
    return np.array(audio, dtype=np.float32)


def main() -> None:
    print("Loading model...")
    t0 = time.time()
    token = os.environ.get("HF_TOKEN")
    model = AutoModel.from_pretrained("ai4bharat/IndicF5", trust_remote_code=True, token=token)
    model.config.remove_sil = False
    print(f"Model loaded in {time.time() - t0:.1f}s")

    print("Synthesizing Kannada...")
    t1 = time.time()
    audio = to_float(model(KN_TEXT, ref_audio_path=str(KN_REF), ref_text=KN_REF_TEXT))
    print(f"Done in {time.time() - t1:.1f}s — {stats(audio)}")
    sf.write("test_kn.wav", audio, 24000)

    print("Synthesizing English with Kannada ref (simulates English Lucien reply)...")
    audio2 = to_float(model(EN_TEXT, ref_audio_path=str(KN_REF), ref_text=KN_REF_TEXT))
    print(f"Done — {stats(audio2)}")
    sf.write("test_en_with_kn_ref.wav", audio2, 24000)


if __name__ == "__main__":
    main()
