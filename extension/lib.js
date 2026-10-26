// Shared by the background worker and the settings page.

export const COPY_SCRIPT_ID = "copy-prompt";
export const ALL_SITES = ["https://*/*", "http://*/*"];

/** { siteUrl, key, copyPrompt }, stored only on this computer. */
export async function getSettings() {
  const { siteUrl = "", key = "", copyPrompt = false } =
    await chrome.storage.local.get(["siteUrl", "key", "copyPrompt"]);
  return { siteUrl, key, copyPrompt };
}

/** "https://example.com/" → "https://example.com", or null if not a site URL. */
export function cleanSiteUrl(raw) {
  try {
    const url = new URL(String(raw).trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Host permission pattern for the site. Match patterns ignore ports. */
export function originPattern(siteUrl) {
  const url = new URL(siteUrl);
  return `${url.protocol}//${url.hostname}/*`;
}

export function isSavable(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

/** Finds a single http(s) link in copied or selected text. */
export function findLink(text) {
  const trimmed = String(text ?? "").trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;
  const matches = trimmed.match(/https?:\/\/[^\s<>"']+/gi);
  return matches && matches.length === 1 ? matches[0].replace(/[),.;:!?]+$/, "") : null;
}

async function call(siteUrl, key, body) {
  const res = await fetch(`${siteUrl}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-owner-key": key },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** Saves a link. Returns { ok, text, sub } for the toast. */
export async function saveLink(url) {
  const { siteUrl, key } = await getSettings();
  if (!siteUrl || !key) {
    return { ok: false, setup: true, text: "Set up the extension first", sub: "Opening settings…" };
  }
  if (!isSavable(url)) {
    return { ok: false, text: "This page can't be saved", sub: "Only web links (http/https) work." };
  }
  try {
    const { status, data } = await call(siteUrl, key, { action: "save", url });
    if (status === 200) {
      return {
        ok: true,
        text: data.duplicate ? "Already saved" : "Saved to articles",
        sub: data.title || url,
      };
    }
    if (status === 401) return { ok: false, text: "Owner key didn't work", sub: "Check it in the extension settings." };
    if (status === 429) return { ok: false, text: "Too many wrong keys", sub: "Try again in an hour." };
    return { ok: false, text: "Couldn't save", sub: data.error || `The site answered ${status}.` };
  } catch {
    return { ok: false, text: "Couldn't reach your site", sub: siteUrl };
  }
}

/** Checks the site and key without saving anything. */
export async function testConnection(siteUrl, key) {
  try {
    const { status } = await call(siteUrl, key, { action: "unlock" });
    if (status === 200) return { ok: true, text: "Connected. Saving works." };
    if (status === 401) return { ok: false, text: "The site is reachable, but the owner key is wrong." };
    if (status === 429) return { ok: false, text: "Too many wrong keys. Try again in an hour." };
    return { ok: false, text: `The site answered ${status}. Is this the right address?` };
  } catch {
    return { ok: false, text: "Couldn't reach the site. Check the address." };
  }
}

/** Turns the copy prompt on or off on every site. */
export async function syncCopyPrompt(enabled) {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [COPY_SCRIPT_ID] });
  const allowed = await chrome.permissions.contains({ origins: ALL_SITES });
  if (enabled && allowed && existing.length === 0) {
    await chrome.scripting.registerContentScripts([
      {
        id: COPY_SCRIPT_ID,
        js: ["toast.js", "copy-prompt.js"],
        matches: ALL_SITES,
        runAt: "document_idle",
        allFrames: false,
      },
    ]);
  } else if ((!enabled || !allowed) && existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [COPY_SCRIPT_ID] });
  }
}
