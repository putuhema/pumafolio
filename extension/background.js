import { findLink, getSettings, saveLink, syncCopyPrompt } from "./lib.js";

const MENU = {
  link: "save-link",
  page: "save-page",
  selection: "save-selection",
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU.link,
      title: "Save link to saved articles",
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: MENU.page,
      title: "Save page to saved articles",
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: MENU.selection,
      title: "Save selected link to saved articles",
      contexts: ["selection"],
    });
  });
  const { siteUrl, key, copyPrompt } = await getSettings();
  await syncCopyPrompt(copyPrompt).catch(() => {});
  if (reason === "install" || !siteUrl || !key) chrome.runtime.openOptionsPage();
});

/** Confirms on the page itself; falls back to the icon badge where pages can't be touched (chrome://, the Web Store). */
async function feedback(tabId, result) {
  if (tabId !== undefined && tabId >= 0) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["toast.js"] });
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text, sub, error) => window.__savedArticlesToast({ text, sub, error }),
        args: [result.text, result.sub || "", !result.ok],
      });
      return;
    } catch {
      /* fall through to the badge */
    }
  }
  const text = result.ok ? "✓" : "!";
  await chrome.action.setBadgeBackgroundColor({ color: result.ok ? "#d6336c" : "#8a6474" });
  await chrome.action.setBadgeText({ text, tabId });
  await chrome.action.setTitle({ title: `${result.text}${result.sub ? ` — ${result.sub}` : ""}`, tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId });
    chrome.action.setTitle({ title: "Save this page (Alt+Shift+S)", tabId });
  }, 2500);
}

async function saveAndTell(url, tabId) {
  const result = await saveLink(url);
  if (result.setup) chrome.runtime.openOptionsPage();
  await feedback(tabId, result);
  return result;
}

// Toolbar button.
chrome.action.onClicked.addListener((tab) => {
  saveAndTell(tab.url, tab.id);
});

// Keyboard shortcut.
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "save-page" && tab) saveAndTell(tab.url, tab.id);
});

// Right-click menu.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url =
    info.menuItemId === MENU.link
      ? info.linkUrl
      : info.menuItemId === MENU.selection
        ? findLink(info.selectionText)
        : info.pageUrl || tab?.url;
  if (!url) {
    feedback(tab?.id, { ok: false, text: "No link in the selection", sub: "Select a single web link." });
    return;
  }
  saveAndTell(url, tab?.id);
});

// The copy prompt asks the worker to save, since only it may call the site.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "save" || typeof message.url !== "string") return false;
  saveLink(message.url).then((result) => {
    if (result.setup) chrome.runtime.openOptionsPage();
    sendResponse(result);
  });
  return true; // keeps sendResponse open for the async reply
});

// Keep the copy prompt in step if the setting or permission changes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "copyPrompt" in changes) {
    syncCopyPrompt(Boolean(changes.copyPrompt.newValue)).catch(() => {});
  }
});
chrome.permissions.onRemoved.addListener(async () => {
  const { copyPrompt } = await getSettings();
  syncCopyPrompt(copyPrompt).catch(() => {});
});
