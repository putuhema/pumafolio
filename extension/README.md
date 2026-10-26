# Saved Articles Chrome extension

Saves links to the portfolio's `/saved` page through `/api/links`, using the
same owner key as `/unlock` in the chat.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this `extension` folder.
3. The settings page opens. Enter your site address and owner key, then
   click **Save and test**.

After editing these files, click the reload icon on the extension's card.

## Ways to save

- **Toolbar icon:** saves the page you're on.
- **Alt+Shift+S:** same as the icon. Change it at `chrome://extensions/shortcuts`.
- **Right-click** a link, a page, or a selected link.
- **Copy a link** on a page, then click Save in the prompt. Off by default;
  turning it on asks Chrome to let the extension run on all sites.

A small toast on the page confirms each save. On pages Chrome protects
(like `chrome://` pages), the icon shows ✓ or ! instead.

## Notes

- The owner key is kept in `chrome.storage.local` on this computer only.
- Copy detection only sees copies made inside web pages, not copies from the
  address bar or other apps. Use the icon or shortcut for those.
- For a site on a new address, update it in settings; Chrome asks for access
  to that address.
