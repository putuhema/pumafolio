"use client";

import { useEffect, useId, useRef, useState } from "react";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };

type Phase = "idle" | "thinking" | "talking";

const STARTERS = [
  { q: "How does simha keep hospital data safe?", tag: "project" },
  { q: "Is Putu open to new work?", tag: "hiring" },
  { q: "What has he shipped to production?", tag: "work" },
  { q: "Summarize his CV in 3 lines", tag: "cv" },
];

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (!part.startsWith("http")) return <span key={i}>{part}</span>;
    const url = part.replace(/[),.;]+$/, "");
    const tail = part.slice(url.length);
    return (
      <span key={i}>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
        {tail}
      </span>
    );
  });
}

export function ChatDock({
  embedded = false,
  onHide,
  fullscreen = false,
  onToggleFullscreen,
}: {
  embedded?: boolean;
  onHide?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [open, setOpen] = useState(false);
  const [palm, setPalm] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const busy = phase === "thinking" || phase === "talking";
  const canSend = draft.trim().length > 0 && !busy;
  const latestAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.content;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 879px)");
    const apply = () => setPalm(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, phase]);

  useEffect(() => {
    if (!open || !palm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, palm]);

  useEffect(() => {
    if (embedded) {
      function onKey(event: KeyboardEvent) {
        if (event.key !== "Escape") return;
        if (fullscreen) {
          onToggleFullscreen?.();
          return;
        }
        onHide?.();
      }
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
    if (!open || !palm) return;
    const dock = document.getElementById("ask-puma");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !dock) return;
      const items = dock.querySelectorAll<HTMLElement>(
        "button, input, a[href], textarea",
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [embedded, fullscreen, onHide, onToggleFullscreen, open, palm]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setDraft("");
    const history = [...messages, { role: "user" as const, content }].slice(
      -6,
    );
    setMessages([...messages, { role: "user", content }]);
    setPhase("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || type.includes("application/json")) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Puma couldn't answer just now.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Puma couldn't answer just now.");
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (!started && acc.trim()) {
          started = true;
          setPhase("talking");
        }
        const next = acc;
        setMessages((current) => {
          const copy = current.slice();
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { role: "assistant", content: next };
          } else {
            copy.push({ role: "assistant", content: next });
          }
          return copy;
        });
      }
      acc += decoder.decode();
      if (!acc.trim()) {
        throw new Error("Puma didn't come back with anything. Try again.");
      }
      setPhase("idle");
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Puma couldn't reach the model. Try again in a bit."
          : error instanceof Error && error.message
            ? error.message
            : "Puma couldn't answer just now.";
      setPhase("idle");
      setMessages((current) => {
        const copy = current.slice();
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && last.content.trim()) {
          copy[copy.length - 1] = {
            role: "assistant",
            content: `${last.content}\n\n${message}`,
          };
        } else if (last?.role === "assistant") {
          copy[copy.length - 1] = { role: "assistant", content: message };
        } else {
          copy.push({ role: "assistant", content: message });
        }
        return copy;
      });
    }
  }

  const dock = (
    <aside
      id="ask-puma"
      className={embedded ? "dock dock-embedded" : "dock"}
      data-open={open ? "true" : "false"}
      data-fullscreen={fullscreen ? "true" : "false"}
      role={palm && open ? "dialog" : "complementary"}
      aria-modal={palm && open ? true : undefined}
      aria-labelledby={titleId}
      inert={palm && !open ? true : undefined}
    >
      <header className="dock-head">
        <h2 id={titleId} className="dock-title">
          <span className="dock-dot" aria-hidden="true" />
          ask puma
        </h2>
        <div className="dock-actions">
          {embedded && onToggleFullscreen ? (
            <button
              type="button"
              className="txtbtn"
              aria-pressed={fullscreen}
              onClick={onToggleFullscreen}
            >
              {fullscreen ? "collapse ↙" : "expand ↗"}
            </button>
          ) : null}
          <button
            type="button"
            className="txtbtn"
            aria-label={embedded ? "Hide chat" : "Close chat"}
            onClick={() => {
              if (embedded) {
                onHide?.();
                return;
              }
              setOpen(false);
              launcherRef.current?.focus();
            }}
          >
            {embedded ? "hide" : "close"}
          </button>
        </div>
      </header>

      <div className="log" ref={logRef}>
        {messages.length === 0 && phase === "idle" ? (
          <div className="empty">
            <p className="empty-lead">
              Puma knows Putu&apos;s projects, stack and how to reach him.
              Ask anything, or try one of these:
            </p>
            <ul className="starters">
              {STARTERS.map((item) => (
                <li key={item.q}>
                  <button type="button" onClick={() => void send(item.q)}>
                    <span>{item.q}</span>
                    <span className="starter-tag">{item.tag}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <p className="msg msg-user" key={i}>
              <span className="gt" aria-hidden="true">
                &gt;{" "}
              </span>
              {msg.content}
            </p>
          ) : msg.content ? (
            <p className="msg msg-bot" key={i}>
              {linkify(msg.content)}
            </p>
          ) : null,
        )}
        {phase === "thinking" ? (
          <p className="think-ellipsis" aria-hidden="true">
            ...
          </p>
        ) : null}
        <div ref={endRef} />
      </div>
      <div className="sr-only" aria-live="polite">
        {phase === "thinking" ? "Puma is thinking" : latestAssistant}
      </div>

      <form
        ref={formRef}
        className="ask"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask puma
        </label>
        <textarea
          id="ask-input"
          ref={inputRef}
          value={draft}
          maxLength={500}
          placeholder="ask anything_"
          autoComplete="off"
          disabled={busy}
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="ask-textarea"
        />
        <button
          type="submit"
          className="ask-send"
          disabled={!canSend}
          aria-label="Send"
        >
          ↵
        </button>
      </form>
    </aside>
  );

  if (embedded) return dock;

  return (
    <>
      <button
        type="button"
        className="scrim"
        hidden={!open}
        aria-label="Close ask puma"
        onClick={() => setOpen(false)}
      />
      {dock}
      <button
        type="button"
        className="launcher"
        ref={launcherRef}
        aria-expanded={open}
        aria-controls="ask-puma"
        onClick={() => setOpen(true)}
      >
        ask puma
      </button>
    </>
  );
}
