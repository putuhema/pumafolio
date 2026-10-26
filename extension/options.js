import {
  ALL_SITES,
  cleanSiteUrl,
  getSettings,
  originPattern,
  syncCopyPrompt,
  testConnection,
} from "./lib.js";

const form = document.getElementById("form");
const siteInput = document.getElementById("siteUrl");
const keyInput = document.getElementById("key");
const copyInput = document.getElementById("copyPrompt");
const button = document.getElementById("save");
const status = document.getElementById("status");

function say(text, kind = "") {
  status.textContent = text;
  status.className = kind;
}

const current = await getSettings();
siteInput.value = current.siteUrl;
keyInput.value = current.key;
copyInput.checked = current.copyPrompt;

document.getElementById("shortcuts").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const siteUrl = cleanSiteUrl(siteInput.value);
  const key = keyInput.value.trim();
  if (!siteUrl) return say("Enter the full address, starting with https:// or http://.", "err");
  if (!key) return say("Enter your owner key.", "err");

  // Ask for permissions first: Chrome only allows it straight after a click.
  const origins = copyInput.checked ? ALL_SITES : [originPattern(siteUrl)];
  const granted = await chrome.permissions.request({ origins });
  if (!granted) {
    return say(
      copyInput.checked
        ? "Chrome didn't allow it. The copy prompt needs access to all sites."
        : "Chrome didn't allow access to your site.",
      "err",
    );
  }

  button.disabled = true;
  say("Testing…");
  await chrome.storage.local.set({ siteUrl, key, copyPrompt: copyInput.checked });
  await syncCopyPrompt(copyInput.checked);
  const result = await testConnection(siteUrl, key);
  say(result.text, result.ok ? "ok" : "err");
  button.disabled = false;
});
