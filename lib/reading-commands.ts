/**
 * Reading-list slash commands. They run in the browser and talk to
 * /api/links directly; none of them call the model.
 */

type Link = {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  readAt: number | null;
};

const KEY_STORAGE = "puma-owner-key";

function getKey() {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

function setKey(value: string | null) {
  try {
    if (value) localStorage.setItem(KEY_STORAGE, value);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* private mode: the unlock only lasts this page view */
  }
}

/** True when this browser has run /unlock. */
export function hasOwnerKey() {
  return Boolean(getKey());
}

async function call(body: object, key: string) {
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-owner-key": key },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

async function loadLinks(): Promise<Link[] | string> {
  const res = await fetch("/api/links", { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as {
    links?: Link[];
    error?: string;
  };
  if (!res.ok || !data.links) return data.error ?? "Couldn't load saved articles.";
  return data.links;
}

const NOT_OWNER = "Only Putu can change saved articles. Try /saved to see them.";

/** Names handled here, so the chat can route them. */
export const READING_COMMANDS = [
  "save",
  "saved",
  "reading",
  "remove",
  "unlock",
  "lock",
] as const;

export type ReadingCommand = (typeof READING_COMMANDS)[number];

export function isReadingCommand(name: string): name is ReadingCommand {
  return (READING_COMMANDS as readonly string[]).includes(name);
}

/** Runs a reading command and returns Puma's reply text. */
export async function runReadingCommand(
  name: ReadingCommand,
  arg: string,
): Promise<string> {
  try {
    switch (name) {
      case "unlock": {
        if (!arg) return "Type /unlock followed by your owner key.";
        const { ok, status } = await call({ action: "unlock" }, arg);
        if (status === 429) return "Too many wrong keys. Try again in an hour.";
        if (!ok) return "That key didn't work.";
        setKey(arg);
        return "Unlocked on this browser. /save and /remove are ready.";
      }
      case "lock":
        setKey(null);
        return "Locked. This browser can't change saved articles now.";
      case "save": {
        const key = getKey();
        if (!key) return NOT_OWNER;
        if (!arg) return "Type /save followed by a link.";
        const { ok, status, data } = await call({ action: "save", url: arg }, key);
        if (status === 429) return "Too many wrong keys. Try again in an hour.";
        if (status === 401) {
          setKey(null);
          return "Your key stopped working, so this browser is locked again.";
        }
        if (!ok) return String(data.error ?? "Couldn't save that link.");
        const title = String(data.title ?? arg);
        return data.duplicate
          ? `**${title}** is already in saved articles.`
          : `Saved **${title}** to saved articles.\n\n${String(data.url)}`;
      }
      case "saved":
      case "reading": {
        const links = await loadLinks();
        if (typeof links === "string") return links;
        const page = `${window.location.origin}/saved`;
        if (links.length === 0) {
          return `Putu hasn't saved any articles yet: ${page}`;
        }
        const summary = `Putu has ${links.length} saved ${links.length === 1 ? "article" : "articles"}. See them all: ${page}`;
        // Only the owner needs numbers, for /remove.
        if (!getKey()) return summary;
        const lines = [summary, "", "Numbered for /remove, newest first:", ""];
        links.forEach((l, i) => lines.push(`- **${i + 1}.** ${l.title}`));
        return lines.join("\n");
      }
      case "remove": {
        const key = getKey();
        if (!key) return NOT_OWNER;
        const n = Number.parseInt(arg, 10);
        if (!Number.isInteger(n) || n < 1) {
          return "Type /remove followed by a number from /saved.";
        }
        const links = await loadLinks();
        if (typeof links === "string") return links;
        const target = links[n - 1];
        if (!target) return `There's no saved link number ${n}.`;
        const { ok, status } = await call({ action: "remove", id: target.id }, key);
        if (status === 429) return "Too many wrong keys. Try again in an hour.";
        if (status === 401) {
          setKey(null);
          return "Your key stopped working, so this browser is locked again.";
        }
        return ok ? `Removed **${target.title}** from the list.` : "Couldn't remove that link.";
      }
    }
  } catch {
    return "Couldn't reach saved articles. Try again in a bit.";
  }
}
