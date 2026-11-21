const $ = (id) => document.getElementById(id);
const DEFAULTS = { whisperUrl: "", apiKey: "", model: "gpt-4o-mini", darkMode: false };

document.addEventListener("DOMContentLoaded", async () => {
  const s = await chrome.storage.sync.get(DEFAULTS);
  $("whisper-url").value = s.whisperUrl;
  $("api-key").value = s.apiKey;
  $("model").value = s.model;
  $("dark-mode").checked = s.darkMode;

  // Dark mode applies instantly
  $("dark-mode").addEventListener("change", () =>
    chrome.storage.sync.set({ darkMode: $("dark-mode").checked }));

  $("save").addEventListener("click", async () => {
    await chrome.storage.sync.set({
      whisperUrl: $("whisper-url").value.trim(),
      apiKey: $("api-key").value.trim(),
      model: $("model").value.trim() || DEFAULTS.model,
      darkMode: $("dark-mode").checked
    });
    $("saved").textContent = "Saved ✓";
    setTimeout(() => ($("saved").textContent = ""), 1500);
  });
});
