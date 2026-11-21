"use client";

import { ArrowUpRightIcon, LockIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChatDock } from "@/components/chat";
import { SavedArticles, type SavedLink } from "@/components/saved-articles";
import {
  depthOf,
  EDGES,
  edgePath,
  isSectionKey,
  LINKS,
  neighbourhood,
  nodeById,
  NODES,
  PATHS,
  VIEW,
  type GraphNode,
  type NodeKind,
  type SectionKey,
} from "@/lib/atlas";
import { site } from "@/lib/site";

const witaClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Makassar",
});

function subscribeClock(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}

function useWitaTime() {
  return useSyncExternalStore(
    subscribeClock,
    () => witaClock.format(Date.now()),
    () => "--:--",
  );
}

function subscribePhone(onChange: () => void) {
  const query = window.matchMedia("(max-width: 879px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/* ---------- Glyphs ---------- */

const BURST = (() => {
  const points: string[] = [];
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? 10.5 : 15;
    const a = (Math.PI * i) / spikes;
    points.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return points.join(" ");
})();

const HEX = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return `${(Math.cos(a) * 12.5).toFixed(2)},${(Math.sin(a) * 12.5).toFixed(2)}`;
}).join(" ");

function Glyph({ node }: { node: GraphNode }) {
  switch (node.kind) {
    case "root":
      return <polygon className="g-burst" points={BURST} />;
    case "path":
      return (
        <>
          <polygon className="g-shape" points={HEX} />
          <text className="g-num" dy="0.36em">
            {node.n}
          </text>
        </>
      );
    case "work":
      return (
        <>
          <polygon className="g-shape" points="0,-12 11,8 -11,8" />
          {node.href ? <circle className="g-dot" cy="2" r="2.2" /> : null}
        </>
      );
    case "quest":
      return (
        <>
          <rect className="g-shape" x="-9" y="-9" width="18" height="18" />
          <circle className="g-dot" r="2.2" />
        </>
      );
    case "link":
      return (
        <>
          <circle className="g-fill" r="9" />
          <circle className="g-hole" r="2.6" />
        </>
      );
    case "page":
      return (
        <path
          className="g-shape"
          d="M-10 -10H10V6H-1L-6 11V6H-10Z"
        />
      );
  }
}

/** The same shapes, small, for the index panel. */
function Mark({ kind }: { kind: NodeKind | "index" }) {
  return (
    <svg className="mark" viewBox="-14 -14 28 28" aria-hidden="true" data-kind={kind}>
      {kind === "index" ? (
        <circle className="g-accent" r="7" />
      ) : kind === "path" ? (
        <polygon className="g-shape" points={HEX} />
      ) : kind === "work" ? (
        <polygon className="g-fill" points="0,-11 11,8 -11,8" />
      ) : kind === "quest" ? (
        <rect className="g-fill" x="-8.5" y="-8.5" width="17" height="17" />
      ) : kind === "link" ? (
        <circle className="g-fill" r="8" />
      ) : kind === "page" ? (
        <path className="g-shape" d="M-10 -10H10V6H-1L-6 11V6H-10Z" />
      ) : (
        <polygon className="g-burst" points={BURST} />
      )}
    </svg>
  );
}

function Label({ node, time }: { node: GraphNode; time: string }) {
  const side = node.side ?? "below";
  const gap = node.kind === "root" ? 30 : 26;
  const at =
    side === "below"
      ? { x: 0, y: gap, anchor: "middle" as const }
      : side === "above"
        ? { x: 0, y: -gap + 6, anchor: "middle" as const }
        : side === "left"
          ? { x: -22, y: 4.5, anchor: "end" as const }
          : { x: 22, y: 4.5, anchor: "start" as const };
  return (
    <g className="g-label-at" style={{ "--lx": at.x, "--ly": at.y } as CSSProperties}>
      <text className="g-label" textAnchor={at.anchor}>
        {node.label}
        {node.kind === "root" ? (
          <tspan className="g-sub" x="0" dy="1.35em">
            Mamuju · {time} WITA
          </tspan>
        ) : null}
      </text>
    </g>
  );
}

/* ---------- Map ---------- */

/** Below this width the index is a bottom sheet. Keep in step with atlas.css. */
const PHONE = "(max-width: 879px)";

type Pan = { x: number; y: number };

function Graph({
  focus,
  selected,
  panelOpen,
  onHot,
  onPick,
  time,
}: {
  focus: string | null;
  selected: string | null;
  /** Desktop only: the dialog is open, so the map slides left to make room. */
  panelOpen: boolean;
  onHot: (id: string | null) => void;
  onPick: (id: string | null, byKey?: boolean) => void;
  time: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, panel: 0 });
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; from: Pan; moved: boolean } | null>(
    null,
  );

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const panel = document.querySelector<HTMLElement>(".index");
      const phone = window.matchMedia(PHONE).matches;
      setSize({
        w: el.clientWidth,
        h: el.clientHeight,
        // Desktop: room for the dialog on the right. Phones: the sheet covers the map.
        panel: !phone && panel ? panel.offsetWidth + 40 : 0,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The zoom always leaves room for the dialog, so opening it only slides the map.
  const roomW = Math.max(size.w - size.panel, 0);
  const fit = Math.min(roomW / VIEW.width, size.h / (VIEW.height + 20));
  // Phones get a map wider than the screen, panned by finger, so labels stay readable.
  const scale = Math.min(Math.max(fit, size.panel ? 0.66 : 0.6), 1.25);
  const areaW = panelOpen ? roomW : size.w;
  const tx = areaW / 2 - VIEW.cx * scale + pan.x;
  const ty = size.h / 2 - VIEW.cy * scale + pan.y;

  const lit = useMemo(() => (focus ? neighbourhood(focus) : null), [focus]);

  function onDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from: pan,
      moved: false,
    };
  }

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setPan({ x: d.from.x + dx, y: d.from.y + dy });
  }

  function onUp(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== event.pointerId) return;
    setDragging(false);
    if (d.moved) return;
    const hit = (event.target as Element).closest<SVGGElement>("[data-node]");
    onPick(hit?.dataset.node ?? null);
  }

  return (
    <div
      ref={wrapRef}
      className="graph"
      data-dragging={dragging ? "" : undefined}
      data-ready={size.w > 0 ? "" : undefined}
      data-focus={focus ? "" : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onDoubleClick={() => setPan({ x: 0, y: 0 })}
      style={{ "--zoom": scale, "--gk": Math.max(1, 0.9 / scale).toFixed(3) } as CSSProperties}
    >
      <svg role="group" aria-label="Map of work and links" width="100%" height="100%">
        <g
          className="world"
          style={{
            transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`,
          }}
        >
          <g className="edges" aria-hidden="true">
            {EDGES.map((edge) => {
              const on = focus !== null && (edge.from === focus || edge.to === focus);
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  className="edge"
                  d={edgePath(edge)}
                  pathLength={edge.dashed ? undefined : 1}
                  data-dashed={edge.dashed ? "" : undefined}
                  data-lit={on ? "" : undefined}
                  style={{ "--d": depthOf(edge.to) } as CSSProperties}
                />
              );
            })}
          </g>
          {NODES.map((node) => (
            <g
              key={node.id}
              className="node"
              data-node={node.id}
              data-kind={node.kind}
              data-faint={node.faint ? "" : undefined}
              data-lit={lit?.has(node.id) ? "" : undefined}
              data-selected={selected === node.id ? "" : undefined}
              transform={`translate(${node.x} ${node.y})`}
              role="button"
              tabIndex={0}
              aria-label={node.kind === "root" ? `${node.label}, profile` : node.label}
              onPointerEnter={() => onHot(node.id)}
              onPointerLeave={() => onHot(null)}
              onFocus={() => onHot(node.id)}
              onBlur={() => onHot(null)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onPick(node.id, true);
              }}
            >
              <g className="node-in" style={{ "--d": depthOf(node.id) } as CSSProperties}>
                <circle className="g-hit" r="24" />
                <g className="g-glyph">
                  <Glyph node={node} />
                </g>
                <g aria-hidden="true">
                  <Label node={node} time={time} />
                </g>
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ---------- Dialog / sheet content ---------- */

type Section = { key: SectionKey; title: string; kind: NodeKind };

const SECTIONS: Section[] = [
  { key: "work", title: "Work", kind: "work" },
  { key: "quests", title: "Side quests", kind: "quest" },
  { key: "elsewhere", title: "Elsewhere", kind: "link" },
  { key: "paths", title: "Paths", kind: "path" },
  { key: "puma", title: "Ask Puma", kind: "page" },
  { key: "saved", title: "Saved", kind: "page" },
];

const byKind = (kind: NodeKind) => NODES.filter((node) => node.kind === kind);

/* One view at a time: the profile, a section, or a single node. */

type View =
  | { kind: "index" }
  | { kind: "section"; key: SectionKey }
  | { kind: "node"; id: string };

const INDEX_TRAIL: View[] = [{ kind: "index" }];

const SECTION_SUB: Record<SectionKey, string> = {
  work: `${site.work.length} projects for the hospital`,
  quests: `${site.fun.length} projects built for fun`,
  elsewhere: "GitHub, LinkedIn and email",
  paths: `${PATHS.length} ways through the map`,
  puma: "Ask an AI about his work",
  saved: "Articles he saved to read",
};

const BIO = `${site.name} is a full-stack & AI engineer in Mamuju, Indonesia. He builds safe AI tools for hospital data: read-only tools, guarded SQL, and a person who approves every fix.`;

const KIND_LABEL: Record<NodeKind, string> = {
  root: "Index",
  path: "Path",
  work: "Work",
  quest: "Side quest",
  link: "Elsewhere",
  page: "Page",
};

function sectionItems(key: SectionKey): GraphNode[] {
  switch (key) {
    case "work":
      return byKind("work");
    case "quests":
      return byKind("quest");
    case "elsewhere":
      return LINKS;
    case "paths":
      return PATHS;
    default:
      return [];
  }
}

function viewTitle(view: View): string {
  if (view.kind === "index") return "Profile";
  if (view.kind === "section") return SECTIONS.find((s) => s.key === view.key)!.title;
  return nodeById(view.id)?.label ?? "Index";
}

function viewMark(view: View): NodeKind | "index" {
  if (view.kind === "index") return "index";
  if (view.kind === "section") return SECTIONS.find((s) => s.key === view.key)!.kind;
  const kind = nodeById(view.id)?.kind ?? "root";
  return kind === "root" ? "index" : kind;
}

function Facts({ time }: { time: string }) {
  return (
    <dl className="facts">
      <div>
        <dt>Now</dt>
        <dd>{site.role}</dd>
      </div>
      <div>
        <dt>Based in</dt>
        <dd>{site.location}</dd>
      </div>
      <div>
        <dt>Time zone</dt>
        <dd>
          {site.timezone}, {time} now
        </dd>
      </div>
      <div>
        <dt>Stack</dt>
        <dd>{site.stack}</dd>
      </div>
      <div>
        <dt>Looking for</dt>
        <dd>{site.availability}</dd>
      </div>
    </dl>
  );
}

function NavRow({
  id,
  mark,
  title,
  sub,
  n,
  faint,
  onClick,
}: {
  id?: string;
  mark: NodeKind | "index";
  title: string;
  sub?: string;
  n?: number;
  faint?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="nav-row"
        data-row={id}
        data-faint={faint ? "" : undefined}
        onClick={onClick}
      >
        <Mark kind={mark} />
        <span className="nav-text">
          <span className="nav-title">
            {n ? <span className="entry-n">{n}</span> : null}
            {title}
          </span>
          {sub ? <span className="nav-sub">{sub}</span> : null}
        </span>
        <span className="nav-go" aria-hidden="true">
          →
        </span>
      </button>
    </li>
  );
}

function NodeList({ nodes, onGo }: { nodes: GraphNode[]; onGo: (view: View) => void }) {
  return (
    <ul className="nav-list">
      {nodes.map((node) => (
        <NavRow
          key={node.id}
          id={node.id}
          mark={node.kind}
          title={node.label}
          sub={node.blurb}
          n={node.n}
          faint={node.faint}
          onClick={() => onGo({ kind: "node", id: node.id })}
        />
      ))}
    </ul>
  );
}

function ViewHead({ kicker, title, blurb }: { kicker?: string; title: string; blurb?: string }) {
  return (
    <header className="view-head">
      {kicker ? <p className="view-kicker">{kicker}</p> : null}
      <h2 className="view-title" tabIndex={-1}>
        {title}
      </h2>
      {blurb ? <p className="view-blurb">{blurb}</p> : null}
    </header>
  );
}

function NodeView({ node, onGo }: { node: GraphNode; onGo: (view: View) => void }) {
  const linked = [...neighbourhood(node.id)]
    .filter((id) => id !== node.id && id !== "root")
    .map((id) => nodeById(id)!)
    .sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  const external = node.href?.startsWith("http");
  return (
    <>
      <ViewHead
        kicker={`${KIND_LABEL[node.kind]}${node.n ? ` ${node.n}` : ""}`}
        title={node.label}
        blurb={node.blurb}
      />
      {node.href ? (
        <a
          className="view-action"
          href={node.href}
          target={external ? "_blank" : undefined}
          rel={external ? "me noreferrer" : undefined}
        >
          {node.kind === "link" ? `Open ${node.label}` : "View project"}
          <ArrowUpRightIcon aria-hidden="true" />
        </a>
      ) : node.href === null ? (
        <p className="view-action view-locked">
          <LockIcon aria-hidden="true" />
          Private repo, no public link
        </p>
      ) : null}
      {linked.length > 0 ? (
        <>
          <h3 className="view-sub">{node.kind === "path" ? "On this path" : "Connected to"}</h3>
          <NodeList nodes={linked} onGo={onGo} />
        </>
      ) : null}
    </>
  );
}

function SheetView({
  view,
  canGoBack,
  backTo,
  onBack,
  onGo,
  time,
  savedLinks,
}: {
  view: View;
  canGoBack: boolean;
  backTo: string;
  onBack: () => void;
  onGo: (view: View) => void;
  time: string;
  savedLinks: SavedLink[];
}) {
  const node = view.kind === "node" ? nodeById(view.id) : undefined;
  const page =
    view.kind === "section" ? view.key : node?.kind === "page" ? (node.section as SectionKey) : null;

  let content: ReactNode = null;
  if (view.kind === "index") {
    content = (
      <>
        <ViewHead kicker="Full-stack & AI engineer" title={site.name} />
        <p className="bio">{BIO}</p>
        <Facts time={time} />
      </>
    );
  } else if (page) {
    const section = SECTIONS.find((s) => s.key === page)!;
    const items = sectionItems(page);
    content = (
      <>
        <ViewHead title={section.title} blurb={node?.blurb ?? SECTION_SUB[page]} />
        {items.length > 0 ? <NodeList nodes={items} onGo={onGo} /> : null}
        {page === "elsewhere" ? (
          <p className="fold-note">
            CV {site.cv.href ? <a href={site.cv.href}>PDF</a> : "coming soon"}.
          </p>
        ) : null}
        {page === "saved" ? <SavedArticles initial={savedLinks} /> : null}
      </>
    );
  } else if (node) {
    content = <NodeView node={node} onGo={onGo} />;
  }

  return (
    <div className="view">
      <div className="view-in" key={JSON.stringify(view)}>
        {canGoBack ? (
          <button type="button" className="view-back" onClick={onBack}>
            <span aria-hidden="true">←</span> {backTo}
          </button>
        ) : null}
        {content}
      </div>
      {/* The chat stays mounted so a conversation survives moving around. */}
      <div className="puma-fold" hidden={page !== "puma"}>
        <ChatDock embedded titleHidden />
      </div>
    </div>
  );
}

export function Atlas({
  savedLinks,
  initialSection = null,
}: {
  savedLinks: SavedLink[];
  initialSection?: SectionKey | null;
}) {
  const time = useWitaTime();
  const [hot, setHot] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Null while nothing is picked: the dialog (or sheet) is hidden.
  const [trail, setTrail] = useState<View[] | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [lastView, setLastView] = useState<View>(INDEX_TRAIL[0]!);
  const byKey = useRef(false);
  const sheetDrag = useRef<{ id: number; y: number; dy: number } | null>(null);
  const phone = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );

  const open = trail !== null;
  // While the dialog animates out it keeps showing the last view.
  const view = trail ? trail[trail.length - 1]! : lastView;
  useEffect(() => {
    if (trail) setLastView(trail[trail.length - 1]!);
  }, [trail]);

  // Deep links: /#work and /saved open on that section; older #profile and #contact land too.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "profile") {
      setTrail(INDEX_TRAIL);
      return;
    }
    const key = hash === "contact" ? "elsewhere" : hash;
    const landing = isSectionKey(key) ? key : initialSection;
    if (landing) setTrail([...INDEX_TRAIL, { kind: "section", key: landing }]);
  }, [initialSection]);

  const close = useCallback(() => {
    setTrail(null);
    setSelected((was) => {
      if (was && byKey.current) {
        document.querySelector<SVGGElement>(`[data-node="${was}"]`)?.focus();
      }
      return null;
    });
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  const pick = useCallback(
    (id: string | null, viaKey = false) => {
      if (!id) return close();
      byKey.current = viaKey;
      setSelected(id);
      setTrail(id === "root" ? INDEX_TRAIL : [...INDEX_TRAIL, { kind: "node", id }]);
    },
    [close],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Each view starts at its top; keyboard users land on its heading.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !trail) return;
    panel.scrollTop = 0;
    if (byKey.current) panel.querySelector<HTMLElement>(".view-title")?.focus();
  }, [trail]);

  function go(next: View) {
    setTrail((prev) => [...(prev ?? INDEX_TRAIL), next]);
    if (next.kind === "node") setSelected(next.id);
  }

  function back() {
    if (!trail || trail.length < 2) return;
    const next = trail.slice(0, -1);
    const top = next[next.length - 1]!;
    setTrail(next);
    setSelected(top.kind === "node" ? top.id : top.kind === "index" ? "root" : null);
  }

  // Phones: pull the sheet down by its header to put it away.
  function onHeadDown(event: ReactPointerEvent<HTMLElement>) {
    if (!phone || event.button !== 0) return;
    if ((event.target as Element).closest("button")) return;
    sheetDrag.current = { id: event.pointerId, y: event.clientY, dy: 0 };
  }

  function onHeadMove(event: ReactPointerEvent<HTMLElement>) {
    const d = sheetDrag.current;
    const panel = panelRef.current;
    if (!d || d.id !== event.pointerId || !panel) return;
    d.dy = Math.max(event.clientY - d.y, 0);
    if (d.dy < 6) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer already ended; pointerup still settles it.
      }
    }
    panel.dataset.dragging = "";
    panel.style.setProperty("--drag", `${d.dy}px`);
  }

  function onHeadUp() {
    const d = sheetDrag.current;
    const panel = panelRef.current;
    sheetDrag.current = null;
    if (!d || !panel) return;
    delete panel.dataset.dragging;
    panel.style.removeProperty("--drag");
    if (d.dy > 80) close();
  }

  const focus = hot ?? selected;

  return (
    <div className="atlas" data-panel={open ? "open" : "closed"}>
      <h1 className="sr-only">
        {site.name}, full-stack &amp; AI engineer
      </h1>

      <Graph
        focus={focus}
        selected={selected}
        panelOpen={open && !phone}
        onHot={setHot}
        onPick={pick}
        time={time}
      />

      <div className="sheet-scrim" aria-hidden="true" onClick={close} />

      <section
        ref={panelRef}
        className="index"
        role="dialog"
        aria-modal={phone ? true : undefined}
        aria-labelledby="panel-title"
        data-open={open ? "" : undefined}
        inert={open ? undefined : true}
        onPointerOver={(event) => {
          const row = (event.target as Element).closest<HTMLElement>("[data-row]");
          setHot(row?.dataset.row ?? null);
        }}
        onPointerLeave={() => setHot(null)}
      >
        <header
          className="panel-head"
          onPointerDown={onHeadDown}
          onPointerMove={onHeadMove}
          onPointerUp={onHeadUp}
          onPointerCancel={onHeadUp}
        >
          <span className="sheet-grip" aria-hidden="true" />
          <span className="panel-line">
            <Mark kind={viewMark(view)} />
            <span className="panel-title" id="panel-title">
              {viewTitle(view)}
            </span>
            <button type="button" className="panel-close" onClick={close}>
              Close
            </button>
          </span>
        </header>
        <SheetView
          view={view}
          canGoBack={(trail?.length ?? 0) > 1}
          backTo={trail && trail.length > 1 ? viewTitle(trail[trail.length - 2]!) : ""}
          onBack={back}
          onGo={go}
          time={time}
          savedLinks={savedLinks}
        />
      </section>
    </div>
  );
}
