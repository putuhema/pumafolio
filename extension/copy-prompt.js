// Offers to save a link when you copy one on a page. Registered only when
// "Offer to save when I copy a link" is on in the extension settings.
(() => {
  if (window.__savedArticlesCopyPrompt) return;
  window.__savedArticlesCopyPrompt = true;

  const QUIET_MS = 15_000;
  const recent = new Map(); // url → time last offered, so it doesn't nag

  /** A single http(s) link in the text, or null. Same rule as lib.js findLink. */
  function findLink(text) {
    const trimmed = String(text ?? "").trim();
    if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;
    const matches = trimmed.match(/https?:\/\/[^\s<>"']+/gi);
    return matches && matches.length === 1 ? matches[0].replace(/[),.;:!?]+$/, "") : null;
  }

  /** What was just copied: selected text, or the selection inside a text field. */
  function copiedText() {
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      try {
        return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
      } catch {
        return ""; // type="email" and similar have no selection range
      }
    }
    return String(window.getSelection() ?? "");
  }

  /** Copying the text of a link (not its address) still offers that link. */
  function linkAroundSelection() {
    const node = window.getSelection()?.anchorNode;
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const href = el?.closest?.("a[href]")?.href;
    return href && /^https?:\/\//i.test(href) ? href : null;
  }

  document.addEventListener(
    "copy",
    () => {
      const url = findLink(copiedText()) || linkAroundSelection();
      if (!url) return;
      const now = Date.now();
      if (now - (recent.get(url) ?? 0) < QUIET_MS) return;
      recent.set(url, now);

      // Let the copy finish first; the prompt shouldn't get in its way.
      setTimeout(async () => {
        const toast = window.__savedArticlesToast;
        if (!toast) return;
        let host = url;
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          /* keep the raw text */
        }
        const wanted = await toast({ text: "Save this link?", sub: host, action: "Save", ms: 6000 });
        if (!wanted) return;
        toast({ text: "Saving…", sub: host, ms: 8000 });
        try {
          const result = await chrome.runtime.sendMessage({ type: "save", url });
          toast({ text: result.text, sub: result.sub || host, error: !result.ok });
        } catch {
          // The extension was reloaded or removed since this page loaded.
          toast({ text: "Reload the page to save", sub: "The extension was updated.", error: true });
        }
      }, 0);
    },
    true,
  );
})();
