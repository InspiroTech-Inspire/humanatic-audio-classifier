# Humanatic Audio-to-Text Classifier

A Chrome extension (Manifest V3) that detects `<audio>`/`<video>` on the page you open, transcribes it with a Whisper server, and classifies the transcript into appointment-intent categories using OpenAI.

## Categories
1. Specific appointment or walk-in time
2. Unscheduled walk-in or loose appointment time
3. Appointment requested but not set
4. No appointment, walk-in, or drop-off discussed
5. Upcoming scheduled appointment
6. Vehicle already in service
7. No, not an appointment opportunity
8. Caller never connected to a live agent
9. Unfamiliar language

## Install (developer mode)
1. Download the latest zip from [Releases](../../releases) (or clone this repo).
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the folder (the one containing `manifest.json`).
4. Click the extension icon -> **Settings** and enter:
   - **Whisper server URL** – an HTTP endpoint that accepts a multipart `file` upload and returns `{"text": "..."}`
   - **OpenAI API key**
   - **Model** (default `gpt-4o-mini`)

## Security
- **Never commit API keys.** Keys live only in Chrome extension storage via the Settings page.
- Rotate any key that has ever been committed or shared.

## Project layout
```
manifest.json
icons/            extension icons
src/
  background.js   service worker: scan -> transcribe -> classify
  popup.*         popup UI (reads results from chrome.storage)
  options.*       settings page
  theme.js        dark-mode helper
  styles.css
docs/index.html   GitHub Pages landing page
.github/workflows/release.yml   builds a zip on every version tag
```

## Releasing
```bash
git tag v1.1.0 && git push origin v1.1.0
```
The workflow attaches `humanatic-audio-classifier-v1.1.0.zip` to a GitHub Release.

## Known limitations
- Only `http(s)` media URLs can be fetched; `blob:` streams are skipped.
- Audio is sent to your Whisper server and the transcript to OpenAI – make sure that's acceptable for your data.

## License
MIT
