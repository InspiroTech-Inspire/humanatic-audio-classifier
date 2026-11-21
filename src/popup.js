const $ = (id) => document.getElementById(id);

function render(r) {
  if (!r) return;
  if (r.transcript) $("transcription-box").textContent = r.transcript;
  if (r.classification) $("classification-box").textContent = r.classification;
  const status = $("status");
  status.textContent = r.error || r.status || "";
  status.className = r.error ? "error" : "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const { lastResult } = await chrome.storage.local.get("lastResult");
  render(lastResult);

  // Live updates while the popup is open (background can't message a closed popup).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.lastResult) render(changes.lastResult.newValue);
  });

  $("settings-button").addEventListener("click", () => chrome.runtime.openOptionsPage());
});
