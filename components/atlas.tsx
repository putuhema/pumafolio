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
/** How much of the closed sheet shows, in px. Keep in step with --peek. */
const PEEK = 112;

type Pan = { x: number; y: number };

function Graph({
  focus,
  selected,
  onHot,
  onPick,
  time,
}: {
  focus: string | null;
  selected: string | null;
  onHot: (id: string | null) => void;
  onPick: (id: string | null) => void;
  time: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, panel: 0, bottom: 0 });
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
        // Desktop: the index docks on the right. Phones: its sheet peeks at the bottom.
        panel: !phone && panel ? panel.offsetWidth + 40 : 0,
        bottom: phone ? PEEK : 0,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const areaW = Math.max(size.w - size.panel, 0);
  const areaH = Math.max(size.h - size.bottom, 0);
  const fit = Math.min(areaW / VIEW.width, areaH / (VIEW.height + 20));
  // Phones get a map wider than the screen, panned by finger, so labels stay readable.
  const scale = Math.min(Math.max(fit, size.panel ? 0.66 : 0.6), 1.25);
  const tx = areaW / 2 - VIEW.cx * scale + pan.x;
  const ty = areaH / 2 - VIEW.cy * scale + pan.y;

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
      <svg aria-hidden="true" width="100%" height="100%">
        <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale.toFixed(3)})`}>
          <g className="edges">
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
              onPointerEnter={() => onHot(node.id)}
              onPointerLeave={() => onHot(null)}
            >
              <g className="node-in" style={{ "--d": depthOf(node.id) } as CSSProperties}>
                <circle className="g-hit" r="24" />
                <g className="g-glyph">
                  <Glyph node={node} />
                </g>
                <Label node={node} time={time} />
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ---------- Index panel ---------- */

type Section = { key: SectionKey; title: string; kind: NodeKind };

const SECTIONS: Section[] = [
  { key: "work", title: "Work", kind: "work" },
  { key: "quests", title: "Side quests", kind: "quest" },
  { key: "elsewhere", title: "Elsewhere", kind: "link" },
  { key: "paths", title: "Paths", kind: "path" },
  { key: "puma", title: "Ask Puma", kind: "page" },
  { key: "saved", title: "Saved", kind: "page" },
];

function Fold({
  id,
  title,
  mark,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  mark: NodeKind | "index";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="fold" data-open={open ? "" : undefined}>
      <h2 className="fold-head">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`fold-${id}`}
          onClick={onToggle}
        >
          <Mark kind={mark} />
          <span className="fold-title">{title}</span>
          <span className="fold-sign" aria-hidden="true">
            {open ? "−" : "+"}
          </span>
        </button>
      </h2>
      <div className="fold-body" id={`fold-${id}`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

function Row({
  node,
  active,
  onHot,
  children,
}: {
  node: GraphNode;
  active: boolean;
  onHot: (id: string | null) => void;
  children: ReactNode;
}) {
  return (
    <li
      className="row-item"
      data-row={node.id}
      data-active={active ? "" : undefined}
      data-faint={node.faint ? "" : undefined}
      onPointerEnter={() => onHot(node.id)}
      onPointerLeave={() => onHot(null)}
      onFocus={() => onHot(node.id)}
      onBlur={() => onHot(null)}
    >
      {children}
    </li>
  );
}

function Entry({ node }: { node: GraphNode }) {
  const external = node.href?.startsWith("http");
  return (
    <>
      <span className="entry-text">
        <span className="entry-name">
          {node.n ? <span className="entry-n">{node.n}</span> : null}
          {node.label}
        </span>
        {node.blurb ? <span className="entry-blurb">{node.blurb}</span> : null}
      </span>
      {node.href ? (
        <a
          className="entry-go"
          href={node.href}
          target={external ? "_blank" : undefined}
          rel={external ? "me noreferrer" : undefined}
        >
          {node.kind === "link" ? "Open" : "View"}
          <span className="sr-only"> {node.label}</span>
          <ArrowUpRightIcon aria-hidden="true" />
        </a>
      ) : node.href === null ? (
        <span className="entry-go entry-locked" title="Private repo, no public link">
          <LockIcon aria-hidden="true" />
          Private
        </span>
      ) : null}
    </>
  );
}

const byKind = (kind: NodeKind) => NODES.filter((node) => node.kind === kind);

/* ---------- Phone sheet: one view at a time ---------- */

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
  mark,
  title,
  sub,
  n,
  faint,
  onClick,
}: {
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
      <h2 className="view-title">{title}</h2>
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
  const [indexOpen, setIndexOpen] = useState(true);
  const [more, setMore] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const sheetDrag = useRef<{ id: number; y: number; dy: number } | null>(null);
  const barDragged = useRef(false);
  // Phones: the sheet shows one thing at a time, with a trail back to the index.
  const [trail, setTrail] = useState<View[]>(INDEX_TRAIL);
  const view = trail[trail.length - 1]!;

  const isPhone = () => window.matchMedia(PHONE).matches;

  const showSheet = useCallback((next: boolean) => {
    setSheetOpen(next);
    const sheet = sheetRef.current;
    if (sheet && !next) sheet.scrollTop = 0;
  }, []);
  const [open, setOpen] = useState<Set<SectionKey>>(
    () => new Set(initialSection ? [initialSection] : []),
  );

  // Deep links: /#work opens that fold. Older links (#profile, #contact) still land.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const key = hash === "contact" ? "elsewhere" : hash;
    if (hash === "profile") setMore(true);
    const landing = isSectionKey(key) ? key : initialSection;
    if (landing && isPhone()) {
      setTrail([...INDEX_TRAIL, { kind: "section", key: landing }]);
      setSheetOpen(true);
    }
    if (isSectionKey(key)) {
      setOpen((prev) => new Set(prev).add(key));
      requestAnimationFrame(() =>
        document.getElementById(`fold-${key}`)?.parentElement?.scrollIntoView({ block: "nearest" }),
      );
    }
  }, [initialSection]);

  const toggle = useCallback((key: SectionKey) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      const hash = next.has(key) ? `#${key}` : window.location.pathname;
      window.history.replaceState(window.history.state, "", hash);
      return next;
    });
  }, []);

  const pick = useCallback((id: string | null) => {
    setSelected(id);
    setTrail(id && id !== "root" ? [...INDEX_TRAIL, { kind: "node", id }] : INDEX_TRAIL);
    if (!id) return;
    const node = nodeById(id);
    if (!node) return;
    if (node.section === "index") {
      setIndexOpen(true);
      setMore(true);
    } else {
      const section = node.section;
      setOpen((prev) => new Set(prev).add(section));
    }
    // On phones a tap opens the sheet straight to that node.
    if (isPhone()) {
      setSheetOpen(true);
      return;
    }
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>(`[data-row="${id}"]`) ??
        document.getElementById(node.section === "index" ? "index-bio" : `fold-${node.section}`);
      target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelected(null);
      setTrail(INDEX_TRAIL);
      setSheetOpen((wasOpen) => {
        if (wasOpen) handleRef.current?.focus();
        return false;
      });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const focus = hot ?? selected;
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);
  const shut = phone && !sheetOpen;
  const pickedNode = selected ? nodeById(selected) : undefined;

  // Each view starts at its top.
  useEffect(() => {
    if (sheetRef.current && phone) sheetRef.current.scrollTop = 0;
  }, [view, phone]);

  function go(next: View) {
    setTrail((prev) => [...prev, next]);
    if (next.kind === "node") setSelected(next.id);
  }

  function back() {
    setTrail((prev) => {
      const next = prev.length > 1 ? prev.slice(0, -1) : prev;
      const top = next[next.length - 1]!;
      setSelected(top.kind === "node" ? top.id : null);
      return next;
    });
  }

  function onBarDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    sheetDrag.current = { id: event.pointerId, y: event.clientY, dy: 0 };
  }

  function onBarMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const d = sheetDrag.current;
    const sheet = sheetRef.current;
    if (!d || d.id !== event.pointerId || !sheet) return;
    d.dy = event.clientY - d.y;
    if (Math.abs(d.dy) < 6) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer already ended; the drag still settles on pointerup.
      }
    }
    sheet.dataset.dragging = "";
    // Follow the finger, but not past either resting place.
    const room = sheet.offsetHeight - PEEK;
    const dy = sheetOpen ? Math.min(Math.max(d.dy, 0), room) : Math.max(Math.min(d.dy, 0), -room);
    sheet.style.setProperty("--drag", `${dy}px`);
  }

  function onBarUp() {
    const d = sheetDrag.current;
    const sheet = sheetRef.current;
    sheetDrag.current = null;
    if (!d || !sheet) return;
    delete sheet.dataset.dragging;
    sheet.style.removeProperty("--drag");
    if (Math.abs(d.dy) < 6) return;
    // A real drag decides by direction; the click that follows is ignored.
    barDragged.current = true;
    if (d.dy < -40) showSheet(true);
    else if (d.dy > 40) showSheet(false);
  }

  const shown = sheetOpen ? view : pickedNode ? ({ kind: "node", id: pickedNode.id } as View) : view;
  const barTitle = viewTitle(shown);
  const barMark = viewMark(shown);

  function rows(nodes: GraphNode[]) {
    return (
      <ul className="rows">
        {nodes.map((node) => (
          <Row key={node.id} node={node} active={focus === node.id} onHot={setHot}>
            <Entry node={node} />
          </Row>
        ))}
      </ul>
    );
  }

  function body(key: SectionKey) {
    switch (key) {
      case "work":
        return rows(byKind("work"));
      case "quests":
        return rows(byKind("quest"));
      case "elsewhere":
        return (
          <>
            {rows(LINKS)}
            <p className="fold-note">
              CV {site.cv.href ? <a href={site.cv.href}>PDF</a> : "coming soon"}.
            </p>
          </>
        );
      case "paths":
        return rows(PATHS);
      case "puma":
        return (
          <div
            className="puma-fold"
            data-row="puma"
            onPointerEnter={() => setHot("puma")}
            onPointerLeave={() => setHot(null)}
          >
            <ChatDock embedded titleHidden />
          </div>
        );
      case "saved":
        return (
          <div
            data-row="saved"
            onPointerEnter={() => setHot("saved")}
            onPointerLeave={() => setHot(null)}
          >
            <SavedArticles initial={savedLinks} />
          </div>
        );
    }
  }

  return (
    <div className="atlas" data-sheet={sheetOpen ? "open" : "peek"}>
      <Graph focus={focus} selected={selected} onHot={setHot} onPick={pick} time={time} />

      <div className="sheet-scrim" aria-hidden="true" onClick={() => showSheet(false)} />

      <aside
        ref={sheetRef}
        className="index"
        aria-label="Index"
        data-open={sheetOpen ? "" : undefined}
      >
        <h1 className="sr-only">
          {site.name}, full-stack &amp; AI engineer
        </h1>
        <button
          ref={handleRef}
          type="button"
          className="sheet-bar"
          aria-expanded={sheetOpen}
          aria-controls="index-body"
          onPointerDown={onBarDown}
          onPointerMove={onBarMove}
          onPointerUp={onBarUp}
          onPointerCancel={onBarUp}
          onClick={() => {
            if (barDragged.current) {
              barDragged.current = false;
              return;
            }
            showSheet(!sheetOpen);
          }}
        >
          <span className="sheet-grip" aria-hidden="true" />
          <span className="sheet-line">
            <Mark kind={barMark} />
            <span className="sheet-title">{barTitle}</span>
            <span className="sheet-sub">
              {pickedNode?.blurb ?? (pickedNode ? "About him" : `${site.name} · full-stack & AI engineer`)}
            </span>
            <span className="sheet-sign" aria-hidden="true">
              {sheetOpen ? "Close" : "Open"}
            </span>
          </span>
        </button>
        <div className="index-body" id="index-body" inert={shut ? true : undefined}>
          {phone ? (
            <SheetView
              view={view}
              canGoBack={trail.length > 1}
              backTo={trail.length > 1 ? viewTitle(trail[trail.length - 2]!) : ""}
              onBack={back}
              onGo={go}
              time={time}
              savedLinks={savedLinks}
            />
          ) : (
          <>
          <section className="fold fold-index" data-open={indexOpen ? "" : undefined}>
            <h2 className="fold-head">
              <button
                type="button"
                aria-expanded={indexOpen}
                aria-controls="index-bio"
                onClick={() => setIndexOpen((v) => !v)}
                onPointerEnter={() => setHot("root")}
                onPointerLeave={() => setHot(null)}
              >
                <Mark kind="index" />
                <span className="fold-title">Index</span>
                <span className="fold-sign" aria-hidden="true">
                  {indexOpen ? "−" : "+"}
                </span>
              </button>
            </h2>
            <div className="fold-body" id="index-bio" hidden={!indexOpen}>
              <p className="bio">
                {site.name} is a full-stack &amp; AI engineer in Mamuju, Indonesia. He
                builds safe AI tools for hospital data: read-only tools, guarded SQL,
                and a person who approves every fix.{" "}
                <button
                  type="button"
                  className="bio-more"
                  aria-expanded={more}
                  onClick={() => setMore((v) => !v)}
                >
                  {more ? "less information" : "more information"}
                </button>
                .
              </p>
              {more ? <Facts time={time} /> : null}
            </div>
          </section>

          {SECTIONS.map((section) => (
            <Fold
              key={section.key}
              id={section.key}
              title={section.title}
              mark={section.kind}
              open={open.has(section.key)}
              onToggle={() => toggle(section.key)}
            >
              {body(section.key)}
            </Fold>
          ))}
          </>
          )}
        </div>
      </aside>
    </div>
  );
}
