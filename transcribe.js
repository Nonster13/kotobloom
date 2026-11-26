
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

const fileInput = document.querySelector("#mediaFile");
const transcribeBtn = document.querySelector("#transcribeBtn");
const progress = document.querySelector("#transcribeProgress");
const status = document.querySelector("#status");

let transcriber = null;
let selectedFile = null;
let isTranscribing = false;

function setProgress(message) {
  progress.textContent = message;
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0] || null;

  transcribeBtn.disabled = !selectedFile;

  if (selectedFile) {
    setProgress(`selected: ${selectedFile.name}`);
  } else {
    setProgress("choose an audio file to get started.");
  }
});

async function loadModel() {
  if (transcriber) return transcriber;

  setProgress("downloading the Japanese AI model...");

  transcriber = await pipeline(
    "automatic-speech-recognition",
    "onnx-community/whisper-tiny",
    {
      dtype: "q8",
      progress_callback: (info) => {
        if (info.status === "progress") {
          const percent = Math.round(info.progress || 0);
          setProgress(`downloading AI model: ${percent}%`);
        } else if (info.status === "ready") {
          setProgress("AI model ready.");
        }
      }
    }
  );

  return transcriber;
}

transcribeBtn.addEventListener("click", async () => {
  if (!selectedFile || isTranscribing) return;

  if (!selectedFile.type.startsWith("audio/")) {
    setProgress(
      "audio files are supported in this first version. video extraction comes next."
    );
    return;
  }

  isTranscribing = true;
  transcribeBtn.disabled = true;
  status.textContent = "TRANSCRIBING";

  try {
    const ai = await loadModel();

    setProgress("preparing your audio...");

    const audioURL = URL.createObjectURL(selectedFile);

    try {
      setProgress("listening to Japanese speech...");

      const result = await ai(audioURL, {
        language: "japanese",
        task: "transcribe",
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5
      });

      const chunks = (result.chunks || [])
        .filter(chunk =>
          chunk.timestamp &&
          Number.isFinite(chunk.timestamp[0]) &&
          Number.isFinite(chunk.timestamp[1]) &&
          chunk.timestamp[1] > chunk.timestamp[0] &&
          chunk.text.trim()
        )
        .map(chunk => ({
          start: chunk.timestamp[0],
          end: chunk.timestamp[1],
          text: chunk.text.trim()
        }));

      if (!chunks.length) {
        throw new Error("No timestamped subtitles were generated.");
      }

      setProgress(`finished! generated ${chunks.length} subtitle segments.`);

      status.textContent = "AI READY";

      // Send the transcript to Kotobloom's subtitle system.
      window.dispatchEvent(
        new CustomEvent("kotobloom:transcription-ready", {
          detail: {
            text: result.text,
            cues: chunks,
            source: "whisper"
          }
        })
      );

    } finally {
      URL.revokeObjectURL(audioURL);
    }

  } catch (error) {
    console.error("Kotobloom transcription error:", error);
    setProgress(`transcription failed: ${error.message}`);
    status.textContent = "ERROR";

  } finally {
    isTranscribing = false;
    transcribeBtn.disabled = !selectedFile;
  }
});

