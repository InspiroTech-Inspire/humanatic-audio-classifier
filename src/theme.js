// Applies the saved dark-mode preference; shared by popup and options pages.
function applyTheme(dark) { document.body.classList.toggle("dark", !!dark); }
chrome.storage.sync.get("darkMode", (d) => applyTheme(d.darkMode));
chrome.storage.onChanged.addListener((c) => { if (c.darkMode) applyTheme(c.darkMode.newValue); });
