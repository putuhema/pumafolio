export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function sanitizeMessages(
  input: unknown,
  maxInput: number,
  history: number,
):
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; status: number; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, status: 400, error: "Bad request." };
  }

  const raw = (input as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, status: 400, error: "Send a message." };
  }

  const slice = raw.slice(-Math.max(history, 1));
  const cleaned: ChatMessage[] = [];

  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    if (!item || typeof item !== "object") {
      return { ok: false, status: 400, error: "Bad request." };
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, status: 400, error: "Bad request." };
    }
    if (typeof content !== "string") {
      return { ok: false, status: 400, error: "Bad request." };
    }
    const text = content
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim();
    if (!text) continue;

    const isLast = i === slice.length - 1;
    if (role === "user" && isLast && text.length > maxInput) {
      return {
        ok: false,
        status: 400,
        error: `Keep it under ${maxInput} characters.`,
      };
    }

    const cap = role === "user" ? maxInput : 2000;
    cleaned.push({ role, content: text.slice(0, cap) });
  }

  const last = cleaned[cleaned.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, status: 400, error: "Send a message." };
  }

  return { ok: true, messages: cleaned };
}
