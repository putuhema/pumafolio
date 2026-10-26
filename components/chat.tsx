"use client";

import { ArrowUpIcon, PlusIcon, SquareIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string; stopped?: boolean };

type Phase = "idle" | "thinking" | "talking";

const STARTERS = [
  { q: "How does simha keep hospital data safe?", tag: "project" },
  { q: "Is Putu open to new work?", tag: "hiring" },
  { q: "What has he shipped to production?", tag: "work" },
  { q: "What's his tech stack?", tag: "stack" },
  { q: "Summarize his CV in 3 lines", tag: "cv" },
];

/** Slash commands. `ask` is sent to Puma; a command without it runs locally. */
const COMMANDS: { name: string; hint: string; ask?: string }[] = [
  { name: "projects", hint: "list his work", ask: "What projects has Putu built?" },
  { name: "stack", hint: "tools he uses", ask: "What is Putu's tech stack?" },
  { name: "cv", hint: "his CV in 3 lines", ask: "Summarize his CV in 3 lines" },
  { name: "hire", hint: "is he open to work", ask: "Is Putu open to new work?" },
  { name: "contact", hint: "email, github", ask: "How can I contact Putu?" },
  { name: "clear", hint: "clear the conversation" },
];

/** Short, readable label for a URL: no protocol, "www." or trailing slash. */
function linkLabel(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

const LINK_RE = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;

function linkify(text: string) {
  return text.split(LINK_RE).map((part, i) => {
    if (i % 2 === 0) return part ? <span key={i}>{part}</span> : null;
    const target = part.replace(/[),.;:]+$/, "");
    const tail = part.slice(target.length);
    const isUrl = target.startsWith("http");
    return (
      <span key={i}>
        <a
          href={isUrl ? target : `mailto:${target}`}
          {...(isUrl ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {isUrl ? linkLabel(target) : target}
        </a>
        {tail}
      </span>
    );
  });
}

/** Inline formatting: **bold** and links. */
function inline(text: string, key: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={`${key}-${i}`}>{linkify(part.slice(2, -2))}</strong>
    ) : (
      <span key={`${key}-${i}`}>{linkify(part)}</span>
    ),
  );
}

const BULLET_RE = /^\s*[-*•]\s+/;

/**
 * A small formatter for Puma's answers: blank lines split paragraphs,
 * "- " lines become a list, and "#" headings fall back to bold lines.
 * It tolerates half-streamed text.
 */
function formatAnswer(text: string) {
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length === 0) return;
    const k = `p${blocks.length}`;
    blocks.push(
      <p key={k}>
        {para.map((line, i) => (
          <span key={i}>
            {i > 0 ? <br /> : null}
            {inline(line, `${k}-${i}`)}
          </span>
        ))}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    const k = `l${blocks.length}`;
    blocks.push(
      <ul key={k}>
        {list.map((item, i) => (
          <li key={i}>{inline(item, `${k}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (BULLET_RE.test(line)) {
      flushPara();
      list.push(line.replace(BULLET_RE, ""));
    } else {
      flushList();
      para.push(line.replace(/^#+\s*(.*)$/, "**$1**"));
    }
  }
  flushPara();
  flushList();
  return blocks;
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
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  // Position in the sent-message history while pressing ↑/↓. null = editing a new draft.
  const [historyAt, setHistoryAt] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titleId = useId();
  const menuId = useId();
  const busy = phase === "thinking" || phase === "talking";
  const canSend = draft.trim().length > 0 && !busy;
  const latestAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.content;
  const sent = messages.filter((m) => m.role === "user").map((m) => m.content);

  // The command menu shows while the draft is a single "/word" with no space yet.
  const slash = /^\/(\S*)$/.exec(draft);
  const matches = slash
    ? COMMANDS.filter((c) => c.name.startsWith(slash[1]!.toLowerCase()))
    : [];
  const menuOpen = matches.length > 0 && !menuDismissed;
  const activeIndex = Math.min(menuIndex, Math.max(matches.length - 1, 0));

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

  useEffect(() => () => abortRef.current?.abort(), []);

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
        if (event.key !== "Escape" || event.defaultPrevented) return;
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
        if (event.defaultPrevented) return;
        setOpen(false);
        launcherRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !dock) return;
      const items = dock.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input, a[href], textarea",
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

  function editDraft(value: string) {
    setDraft(value);
    setMenuIndex(0);
    setMenuDismissed(false);
    setHistoryAt(null);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function runCommand(name: string) {
    const command = COMMANDS.find((c) => c.name === name);
    if (!command) return;
    editDraft("");
    if (command.ask) {
      void send(command.ask);
      return;
    }
    if (command.name === "clear") {
      stop();
      setMessages([]);
      setPhase("idle");
    }
    inputRef.current?.focus();
  }

  function submit() {
    const exact = /^\/(\S+)\s*$/.exec(draft.trim());
    if (exact && COMMANDS.some((c) => c.name === exact[1]!.toLowerCase())) {
      runCommand(exact[1]!.toLowerCase());
      return;
    }
    void send(draft);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    editDraft("");
    const history = [...messages, { role: "user" as const, content }]
      .filter((m) => m.content.trim())
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages([...messages, { role: "user", content }]);
    setPhase("thinking");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
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
      const stopped = controller.signal.aborted;
      const message =
        error instanceof TypeError
          ? "Puma couldn't reach the model. Try again in a bit."
          : error instanceof Error && error.message
            ? error.message
            : "Puma couldn't answer just now.";
      setPhase("idle");
      setMessages((current) => {
        // /clear aborts too; don't bring back a cleared conversation.
        if (current.length === 0) return current;
        const copy = current.slice();
        const last = copy[copy.length - 1];
        if (stopped) {
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, stopped: true };
          } else {
            copy.push({ role: "assistant", content: "", stopped: true });
          }
          return copy;
        }
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
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function onComposerKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;

    if (menuOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setMenuIndex((activeIndex + step + matches.length) % matches.length);
        return;
      }
      if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
        event.preventDefault();
        runCommand(matches[activeIndex]!.name);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuDismissed(true);
        return;
      }
    }

    if (event.key === "Escape" && busy) {
      event.preventDefault();
      stop();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }

    // ↑/↓ walk through what you've sent, like a shell, when the caret is at the edge.
    const el = event.currentTarget;
    if (event.key === "ArrowUp" && sent.length > 0) {
      const atTop = !el.value.slice(0, el.selectionStart).includes("\n");
      if (!atTop || (historyAt === null && el.value.trim() !== "")) return;
      event.preventDefault();
      const next = historyAt === null ? sent.length - 1 : Math.max(historyAt - 1, 0);
      setHistoryAt(next);
      setDraft(sent[next]!);
      setMenuDismissed(true);
      return;
    }
    if (event.key === "ArrowDown" && historyAt !== null) {
      const atBottom = !el.value.slice(el.selectionEnd).includes("\n");
      if (!atBottom) return;
      event.preventDefault();
      const next = historyAt + 1;
      if (next >= sent.length) {
        setHistoryAt(null);
        setDraft("");
      } else {
        setHistoryAt(next);
        setDraft(sent[next]!);
      }
      setMenuDismissed(true);
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
        {messages.map((msg, i) => {
          const same = i > 0 && messages[i - 1]!.role === msg.role;
          if (msg.role === "user") {
            return (
              <div key={i} className={same ? "row row-user row-same" : "row row-user"}>
                <p className="bubble bubble-user">
                  <span className="sr-only">You: </span>
                  {msg.content}
                </p>
              </div>
            );
          }
          return (
            <div key={i} className={same ? "row-same" : undefined}>
              {msg.content.trim() ? (
                <div className="row">
                  <span className="avatar" aria-hidden="true">
                    p
                  </span>
                  <div className="bubble bubble-bot">
                    <span className="sr-only">Puma: </span>
                    {formatAnswer(msg.content)}
                  </div>
                </div>
              ) : null}
              {msg.stopped ? <p className="bubble-note">stopped</p> : null}
            </div>
          );
        })}
        {phase === "thinking" ? (
          <div className="row">
            <span className="avatar" aria-hidden="true">
              p
            </span>
            <div className="bubble bubble-bot" aria-hidden="true">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
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
          submit();
        }}
      >
        {menuOpen ? (
          <ul className="slash-menu" id={menuId} role="listbox" aria-label="Commands">
            {matches.map((command, i) => (
              <li
                key={command.name}
                id={`${menuId}-${command.name}`}
                role="option"
                aria-selected={i === activeIndex}
                className="slash-item"
                onMouseEnter={() => setMenuIndex(i)}
                onMouseDown={(event) => {
                  // Keep focus in the textarea.
                  event.preventDefault();
                  runCommand(command.name);
                }}
              >
                <code>/{command.name}</code>
                <span>{command.hint}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <label className="sr-only" htmlFor="ask-input">
          Ask puma
        </label>
        <InputGroup className="ask-group">
          <InputGroupAddon align="inline-start" className="ask-addon">
            <InputGroupButton
              size="icon-sm"
              className="ask-icon ask-plus rounded-full"
              aria-label="Show commands"
              onClick={() => {
                editDraft("/");
                inputRef.current?.focus();
              }}
            >
              <PlusIcon />
            </InputGroupButton>
          </InputGroupAddon>
          <InputGroupTextarea
            id="ask-input"
            ref={inputRef}
            value={draft}
            maxLength={500}
            placeholder="Type / for commands"
            autoComplete="off"
            rows={1}
            role="combobox"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              menuOpen ? `${menuId}-${matches[activeIndex]!.name}` : undefined
            }
            onChange={(event) => editDraft(event.target.value)}
            onKeyDown={onComposerKey}
            className="ask-textarea"
          />
          <InputGroupAddon align="inline-end" className="ask-addon">
            {busy ? (
              <InputGroupButton
                size="icon-sm"
                variant="default"
                className="ask-icon rounded-full"
                aria-label="Stop answer"
                onClick={stop}
              >
                <SquareIcon className="size-3 fill-current" />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                className="ask-icon rounded-full"
                disabled={!canSend}
                aria-label="Send"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>

        <div className="ask-foot">
          <span>
            <kbd>↵</kbd> send · <kbd>⇧↵</kbd> new line
          </span>
          <span className="ask-status" aria-hidden="true">
            {busy ? (
              <>
                esc to stop
                <span className="ask-spinner" />
              </>
            ) : embedded ? (
              "esc to hide"
            ) : (
              "esc to close"
            )}
          </span>
        </div>
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
