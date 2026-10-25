"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePanelRef } from "react-resizable-panels";
import { ChatDock } from "@/components/chat";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const CHAT_OPEN_KEY = "ask-puma-open";

function subscribePalm(onStoreChange: () => void) {
  const mq = window.matchMedia("(max-width: 879px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getPalmSnapshot() {
  return window.matchMedia("(max-width: 879px)").matches;
}

function getPalmServerSnapshot() {
  return false;
}

function readStoredOpen() {
  try {
    const raw = localStorage.getItem(CHAT_OPEN_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function FolioShell({ children }: { children: ReactNode }) {
  const palm = useSyncExternalStore(
    subscribePalm,
    getPalmSnapshot,
    getPalmServerSnapshot,
  );
  const chatPanelRef = usePanelRef();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const open = readStoredOpen();
    setChatOpen(open);
    setHydrated(true);
    if (!open) {
      requestAnimationFrame(() => chatPanelRef.current?.collapse());
    }
  }, [chatPanelRef]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CHAT_OPEN_KEY, chatOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [chatOpen, hydrated]);

  const hideChat = useCallback(() => {
    setFullscreen(false);
    chatPanelRef.current?.collapse();
    setChatOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, [chatPanelRef]);

  const showChat = useCallback(() => {
    chatPanelRef.current?.expand();
    setChatOpen(true);
  }, [chatPanelRef]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((current) => !current);
  }, []);

  if (palm) {
    return (
      <div className="shell">
        {children}
        <ChatDock />
      </div>
    );
  }

  return (
    <div
      className="shell shell-resizable"
      data-chat={chatOpen ? "open" : "closed"}
      data-fullscreen={fullscreen ? "true" : "false"}
    >
      <ResizablePanelGroup orientation="horizontal" className="shell-panels">
        <ResizablePanel defaultSize="55%" minSize="32%" className="min-w-0">
          <div className="profile-pane">{children}</div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="shell-handle"
          disabled={!chatOpen || fullscreen}
        />
        <ResizablePanel
          id="ask-puma-panel"
          panelRef={chatPanelRef}
          collapsible
          collapsedSize={0}
          minSize="28%"
          defaultSize="45%"
          className="chat-panel min-w-0"
          onResize={(size) => {
            const open = size.asPercentage > 1;
            setChatOpen((prev) => (prev === open ? prev : open));
          }}
        >
          <div
            className="h-full w-full"
            inert={!chatOpen ? true : undefined}
          >
            <ChatDock
              embedded
              onHide={hideChat}
              fullscreen={fullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {!chatOpen ? (
        <button
          type="button"
          className="launcher launcher-desk"
          ref={launcherRef}
          aria-expanded={false}
          aria-controls="ask-puma"
          onClick={showChat}
        >
          ask puma
        </button>
      ) : null}
    </div>
  );
}
