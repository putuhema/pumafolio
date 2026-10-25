"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Puma, type PumaExpression } from "./puma";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };

type Phase = "idle" | "thinking" | "talking" | "idea" | "error";

const SLEEP_AFTER_MS = 45_000;

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

function expressionFor(
  phase: Phase,
  focused: boolean,
  asleep: boolean,
): PumaExpression {
  if (phase === "error") return "confused";
  if (phase === "thinking") return "thinking";
  if (phase === "talking") return "talking";
  // Idea is a short beat after an answer. The field usually stays focused,
  // so this has to win over listening or the face never changes.
  if (phase === "idea") return "idea";
  if (focused) return "listening";
  if (asleep) return "sleepy";
  return "idle";
}

export function ChatDock() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [focused, setFocused] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [open, setOpen] = useState(false);
  const [palm, setPalm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef(0);
  const titleId = useId();
  const busy = phase === "thinking" || phase === "talking";
  const expression = expressionFor(phase, focused, asleep);
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
    lastActive.current = Date.now();
    const bump = () => {
      lastActive.current = Date.now();
      setAsleep(false);
    };
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, bump));
    const id = window.setInterval(() => {
      if (Date.now() - lastActive.current >= SLEEP_AFTER_MS) setAsleep(true);
    }, 1000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, bump));
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (phase !== "idea") return;
    const id = window.setTimeout(() => setPhase("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [phase]);

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
  }, [open, palm]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    lastActive.current = Date.now();
    setAsleep(false);
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

      const mood = res.headers.get("X-Puma-Mood");
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
      const declined = /^\s*That's outside what I know about Putu/.test(acc);
      setPhase(mood === "idle" || declined ? "idle" : "idea");
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Puma couldn't reach the model. Try again in a bit."
          : error instanceof Error && error.message
            ? error.message
            : "Puma couldn't answer just now.";
      setPhase("error");
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

  return (
    <>
      <button
        type="button"
        className="scrim"
        hidden={!open}
        aria-label="Close ask puma"
        onClick={() => setOpen(false)}
      />
      <aside
        id="ask-puma"
        className="dock"
        data-open={open ? "true" : "false"}
        data-expression={expression}
        role={palm && open ? "dialog" : "complementary"}
        aria-modal={palm && open ? true : undefined}
        aria-labelledby={titleId}
        inert={palm && !open ? true : undefined}
      >
        <header className="dock-head">
          <h2 id={titleId} className="dock-title">
            ask puma
            <Puma expression={expression} size={46} />
          </h2>
          <button
            type="button"
            className="dock-close"
            onClick={() => {
              setOpen(false);
              launcherRef.current?.focus();
            }}
          >
            close
          </button>
        </header>

        <div className="log" ref={logRef}>
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
            <div className="think-block">
              <p className="think-ellipsis" aria-hidden="true">
                ...
              </p>
              <Puma expression="thinking" size={54} />
              <span className="sr-only">Puma is thinking</span>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
        <div className="sr-only" aria-live="polite">
          {phase === "thinking" ? "Puma is thinking" : latestAssistant}
        </div>

        <form
          className="ask"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <div className="peek" aria-hidden="true">
            <Puma className="peek-puma" expression={expression} size={190} />
          </div>
          <label className="sr-only" htmlFor="ask-input">
            Ask puma
          </label>
          <input
            id="ask-input"
            ref={inputRef}
            className="ask-input"
            value={draft}
            maxLength={500}
            placeholder="ask anything_"
            autoComplete="off"
            enterKeyHint="send"
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => {
              setFocused(true);
              lastActive.current = Date.now();
              setAsleep(false);
            }}
            onBlur={() => setFocused(false)}
          />
          <button type="submit" className="sr-only" disabled={busy}>
            Send
          </button>
        </form>
      </aside>

      <button
        type="button"
        className="launcher"
        ref={launcherRef}
        aria-expanded={open}
        aria-controls="ask-puma"
        onClick={() => setOpen(true)}
      >
        <Puma expression="idle" size={32} />
        ask puma
      </button>
    </>
  );
}
