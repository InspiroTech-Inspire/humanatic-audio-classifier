// Humanatic Audio-to-Text Classifier - service worker
// Flow: page finishes loading -> find <audio>/<video> sources -> Whisper -> OpenAI classify -> save to storage

const DEFAULTS = {
  whisperUrl: "",
  apiKey: "",
  model: "gpt-4o-mini"
};

const CATEGORIES = [
  "1. SPECIFIC APPOINTMENT OR WALK-IN TIME",
  "2. UNSCHEDULED WALK-IN OR LOOSE APPOINTMENT TIME",
  "3. APPOINTMENT REQUESTED BUT NOT SET",
  "4. NO APPOINTMENT, WALK-IN, OR DROP-OFF DISCUSSED",
  "5. UPCOMING SCHEDULED APPOINTMENT",
  "6. VEHICLE ALREADY IN SERVICE",
  "7. NO, NOT AN APPOINTMENT OPPORTUNITY",
  "8. CALLER NEVER CONNECTED TO A LIVE AGENT",
  "9. UNFAMILIAR LANGUAGE"
];

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") scanForAudio(tabId);
});

async function scanForAudio(tabId) {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: findAudioSources
    });
    for (const url of injection?.result ?? []) {
      await processAudio(url);
    }
  } catch (err) {
    // Restricted pages (chrome://, Web Store, etc.) can't be scripted - ignore.
    console.debug("Scan skipped:", err.message);
  }
}

// Runs inside the page. Returns plain http(s) URLs only (blob:/data: can't be fetched from the worker).
function findAudioSources() {
  const urls = new Set();
  document.querySelectorAll("audio, video").forEach((el) => {
    const src = el.currentSrc || el.src;
    if (src && /^https?:/i.test(src)) urls.add(src);
    el.querySelectorAll("source").forEach((s) => {
      if (s.src && /^https?:/i.test(s.src)) urls.add(s.src);
    });
  });
  return [...urls];
}

async function processAudio(audioUrl) {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  const { processed = [] } = await chrome.storage.session.get("processed");
  if (processed.includes(audioUrl)) return; // don't re-transcribe the same file

  if (!settings.whisperUrl || !settings.apiKey) {
    await saveResult({ error: "Open Settings and add your Whisper URL and OpenAI API key." });
    return;
  }

  try {
    await chrome.storage.session.set({ processed: [...processed, audioUrl].slice(-50) });
    await saveResult({ status: "Transcribing..." });
    const transcript = await transcribe(audioUrl, settings.whisperUrl);
    if (!transcript) {
      await saveResult({ error: "No speech detected in audio." });
      return;
    }
    await saveResult({ status: "Classifying...", transcript });
    const classification = await classify(transcript, settings);
    await saveResult({ transcript, classification, sourceUrl: audioUrl });
  } catch (err) {
    console.error(err);
    await saveResult({ error: err.message });
  }
}

async function transcribe(audioUrl, whisperUrl) {
  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) throw new Error(`Could not download audio (${audioResp.status}).`);
  const formData = new FormData();
  formData.append("file", await audioResp.blob(), "audio.mp3");

  const resp = await fetch(whisperUrl, {
    method: "POST",
    headers: { "ngrok-skip-browser-warning": "true" },
    body: formData
  });
  if (!resp.ok) throw new Error(`Whisper server error (${resp.status}).`);
  const data = await resp.json();
  return (data.text || "").trim();
}

async function classify(text, { apiKey, model }) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 50,
      messages: [
        { role: "system", content: "You are an AI that classifies call transcripts into predefined categories." },
        {
          role: "user",
          content:
            `Classify the following text into one of these categories:\n${CATEGORIES.join("\n")}\n\n` +
            `Text: """${text}"""\n\n` +
            `Return only the category number and title. If no suitable category is found, return 'No Answer'.`
        }
      ]
    })
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(`OpenAI error (${resp.status}): ${body.error?.message ?? "request failed"}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "No Answer";
}

function saveResult(result) {
  return chrome.storage.local.set({ lastResult: { ...result, at: Date.now() } });
}
