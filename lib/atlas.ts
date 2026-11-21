import { site } from "@/lib/site";

/** The shapes on the map. Each kind has its own glyph and index section. */
export type NodeKind = "root" | "path" | "work" | "quest" | "link" | "page";

export type SectionKey =
  | "work"
  | "quests"
  | "elsewhere"
  | "paths"
  | "puma"
  | "saved";

export type LabelSide = "below" | "above" | "left" | "right";

export type GraphNode = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Where this node lives in the index panel. */
  section: SectionKey | "index";
  href?: string | null;
  /** Drawn grey, for things with no public face. */
  faint?: boolean;
  /** Path number, drawn inside the hexagon. */
  n?: number;
  blurb?: string;
  side?: LabelSide;
};

export type GraphEdge = {
  from: string;
  to: string;
  dashed?: boolean;
  /** A stepped line instead of a straight one. */
  elbow?: boolean;
};

/** The map is drawn in this box; the page scales it to fit. */
export const VIEW = { width: 1000, height: 760, cx: 500, cy: 370 };

export const PATHS: GraphNode[] = [
  {
    id: "p1",
    n: 1,
    label: "Hospital software",
    kind: "path",
    x: 370,
    y: 540,
    section: "paths",
    side: "left",
    blurb: "Tools for RSUD Mamuju Tengah, used by real staff every day.",
  },
  {
    id: "p2",
    n: 2,
    label: "AI agents",
    kind: "path",
    x: 660,
    y: 470,
    section: "paths",
    side: "right",
    blurb: "LLM tools that touch clinical data carefully: read-only, guarded, reviewed.",
  },
  {
    id: "p3",
    n: 3,
    label: "Side quests",
    kind: "path",
    x: 310,
    y: 300,
    section: "paths",
    side: "left",
    blurb: "Things built for fun, not for an employer.",
  },
  {
    id: "p4",
    n: 4,
    label: "Reading",
    kind: "path",
    x: 700,
    y: 270,
    section: "paths",
    side: "right",
    blurb: "Articles saved to read later, newest first.",
  },
  {
    id: "p5",
    n: 5,
    label: "Elsewhere",
    kind: "path",
    x: 500,
    y: 185,
    section: "paths",
    side: "right",
    blurb: "Where to find him, and how to say hello.",
  },
];

const WORK_AT: Record<string, Pick<GraphNode, "x" | "y" | "side">> = {
  "rsud-hadir": { x: 215, y: 655 },
  simha: { x: 500, y: 680 },
  "hospital-ai": { x: 830, y: 575 },
};

const QUEST_AT: Record<string, Pick<GraphNode, "x" | "y" | "side">> = {
  jujurnal: { x: 150, y: 190 },
  "my-mini-games": { x: 160, y: 410 },
};

const work: GraphNode[] = site.work.map((item, i) => ({
  id: item.slug,
  label: item.name,
  kind: "work",
  section: "work",
  href: item.href,
  faint: item.href === null,
  blurb: item.description,
  ...(WORK_AT[item.slug] ?? { x: 200 + i * 220, y: 690 }),
}));

const quests: GraphNode[] = site.fun.map((item, i) => ({
  id: item.slug,
  label: item.name,
  kind: "quest",
  section: "quests",
  href: item.href,
  blurb: item.description,
  ...(QUEST_AT[item.slug] ?? { x: 140, y: 200 + i * 160 }),
}));

export const LINKS: GraphNode[] = [
  {
    id: "github",
    label: "GitHub",
    kind: "link",
    x: 370,
    y: 85,
    section: "elsewhere",
    href: site.github,
    blurb: "@putuhema",
    side: "above",
  },
  {
    id: "email",
    label: "Email",
    kind: "link",
    x: 500,
    y: 55,
    section: "elsewhere",
    href: `mailto:${site.email}`,
    blurb: site.email,
    side: "above",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    kind: "link",
    x: 630,
    y: 85,
    section: "elsewhere",
    href: site.linkedin,
    blurb: "in/putuhema",
    side: "above",
  },
];

export const ROOT: GraphNode = {
  id: "root",
  label: site.name,
  kind: "root",
  x: VIEW.cx,
  y: 380,
  section: "index",
  side: "left",
};

export const NODES: GraphNode[] = [
  ROOT,
  ...PATHS,
  ...work,
  ...quests,
  ...LINKS,
  {
    id: "puma",
    label: "Ask Puma",
    kind: "page",
    x: 820,
    y: 395,
    section: "puma",
    blurb: "An AI that knows his projects, stack and how to reach him.",
    side: "right",
  },
  {
    id: "saved",
    label: "Saved articles",
    kind: "page",
    x: 850,
    y: 175,
    section: "saved",
    blurb: "Articles he saved to read.",
    side: "above",
  },
];

export const EDGES: GraphEdge[] = [
  { from: "root", to: "p1", elbow: true },
  { from: "root", to: "p2" },
  { from: "root", to: "p3" },
  { from: "root", to: "p4" },
  { from: "root", to: "p5" },
  { from: "p1", to: "rsud-hadir", elbow: true, dashed: true },
  { from: "p1", to: "simha", elbow: true },
  { from: "p2", to: "simha", dashed: true },
  { from: "p2", to: "hospital-ai" },
  { from: "p2", to: "puma", dashed: true },
  { from: "p3", to: "jujurnal" },
  { from: "p3", to: "my-mini-games" },
  { from: "p4", to: "saved", dashed: true },
  { from: "p5", to: "github" },
  { from: "p5", to: "email" },
  { from: "p5", to: "linkedin" },
];

const BY_ID = new Map(NODES.map((node) => [node.id, node]));

export function nodeById(id: string): GraphNode | undefined {
  return BY_ID.get(id);
}

/** A node and everything one edge away from it. */
export function neighbourhood(id: string): Set<string> {
  const lit = new Set([id]);
  for (const edge of EDGES) {
    if (edge.from === id) lit.add(edge.to);
    if (edge.to === id) lit.add(edge.from);
  }
  return lit;
}

/** Steps from the root, for the staggered entrance. */
export function depthOf(id: string): number {
  if (id === "root") return 0;
  const parents = EDGES.filter((edge) => edge.to === id).map((edge) => edge.from);
  if (parents.length === 0) return 0;
  return 1 + Math.min(...parents.map(depthOf));
}

export function edgePath(edge: GraphEdge): string {
  const a = BY_ID.get(edge.from)!;
  const b = BY_ID.get(edge.to)!;
  if (!edge.elbow) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  const midY = Math.round((a.y + b.y) / 2);
  return `M${a.x} ${a.y}V${midY}H${b.x}V${b.y}`;
}

export function isSectionKey(value: string): value is SectionKey {
  return ["work", "quests", "elsewhere", "paths", "puma", "saved"].includes(value);
}
