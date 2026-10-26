// A small toast in the corner of the page, inside a shadow root so the
// page's CSS can't touch it. Used by the copy prompt and to confirm saves.
// Injected more than once on purpose, so it only defines itself once.
(() => {
  if (window.__savedArticlesToast) return;

  const CSS = `
    :host { all: initial; }
    .toast {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      display: flex; align-items: center; gap: 10px;
      max-width: min(360px, calc(100vw - 32px));
      padding: 10px 10px 10px 14px; border-radius: 12px;
      background: #fdf7f9; color: #2a1520;
      border: 1px solid #ecd3dd;
      box-shadow: 0 12px 32px -12px rgb(42 21 32 / 35%);
      font: 500 13px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      opacity: 0; transform: translateY(8px) scale(0.98);
      transition: opacity 140ms cubic-bezier(.23,1,.32,1), transform 180ms cubic-bezier(.23,1,.32,1);
    }
    .toast.in { opacity: 1; transform: none; }
    .dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #d6336c; }
    .err .dot { background: #8a6474; }
    .text { flex: 1; min-width: 0; }
    .sub { display: block; color: #8a6474; font-weight: 400;
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    button {
      all: unset; cursor: pointer; flex: none; border-radius: 8px;
      padding: 6px 10px; font-weight: 600; transition: background 120ms;
    }
    .save { background: #d6336c; color: #fff5f8; }
    .save:hover { background: #c22a5f; }
    .close { color: #8a6474; padding: 6px 8px; }
    .close:hover { background: #f8dbe6; }
    button:focus-visible { outline: 2px solid #d6336c; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
  `;

  let host = null;
  let timer = 0;

  function clear() {
    clearTimeout(timer);
    host?.remove();
    host = null;
  }

  /**
   * show({ text, sub, error, action, ms }) → Promise<boolean>
   * Resolves true when the action button is clicked, false when dismissed.
   */
  function show({ text, sub = "", error = false, action = "", ms = 2200 }) {
    clear();
    host = document.createElement("saved-articles-toast");
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>${CSS}</style>`;

    const box = document.createElement("div");
    box.className = error ? "toast err" : "toast";
    box.setAttribute("role", action ? "alertdialog" : "status");
    box.setAttribute("aria-live", "polite");

    const dot = document.createElement("span");
    dot.className = "dot";
    const body = document.createElement("span");
    body.className = "text";
    body.textContent = text;
    if (sub) {
      const small = document.createElement("span");
      small.className = "sub";
      small.textContent = sub;
      body.append(small);
    }
    box.append(dot, body);

    const mine = host;
    const done = new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        document.removeEventListener("keydown", onKey, true);
        box.classList.remove("in");
        // Remove only this toast; a newer one may already have replaced it.
        setTimeout(() => {
          if (host === mine) clear();
          else mine.remove();
        }, 160);
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === "Escape") finish(false);
      };
      if (action) {
        const save = document.createElement("button");
        save.className = "save";
        save.textContent = action;
        save.addEventListener("click", () => finish(true));
        const close = document.createElement("button");
        close.className = "close";
        close.setAttribute("aria-label", "Dismiss");
        close.textContent = "✕";
        close.addEventListener("click", () => finish(false));
        box.append(save, close);
        document.addEventListener("keydown", onKey, true);
        // Stay while the pointer is on it.
        box.addEventListener("mouseenter", () => clearTimeout(timer));
        box.addEventListener("mouseleave", () => {
          timer = setTimeout(() => finish(false), 2500);
        });
      }
      timer = setTimeout(() => finish(false), ms);
    });

    root.append(box);
    (document.body || document.documentElement).append(host);
    requestAnimationFrame(() => box.classList.add("in"));
    return done;
  }

  window.__savedArticlesToast = show;
})();
