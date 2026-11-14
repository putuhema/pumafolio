import { site, type WorkItem } from "@/lib/site";

export type CanvasPoint = { x: number; y: number };

export type NodeKind = "profile" | "project" | "side" | "links" | "agent";

export type CanvasNode = {
  key: string;
  kind: NodeKind;
  title: string;
  item?: WorkItem;
};

export const KIND_LABEL: Record<NodeKind, string> = {
  profile: "start",
  project: "project",
  side: "side project",
  links: "links",
  agent: "agent",
};

export const CANVAS_NODES: CanvasNode[] = [
  { key: "profile", kind: "profile", title: site.name },
  ...site.work.map((item) => ({
    key: item.slug,
    kind: "project" as const,
    title: item.name,
    item,
  })),
  ...site.fun.map((item) => ({
    key: item.slug,
    kind: "side" as const,
    title: item.name,
    item,
  })),
  { key: "links", kind: "links", title: "elsewhere" },
  { key: "ask-puma", kind: "agent", title: "ask puma" },
];

const COLUMN = 440;
const ROW = 180;

function column(items: WorkItem[], x: number, top: number) {
  return Object.fromEntries(
    items.map((item, index) => [item.slug, { x, y: top + index * ROW }]),
  );
}

const funTop = site.work.length * ROW + 48;

export const DEFAULT_POSITIONS: Record<string, CanvasPoint> = {
  profile: { x: 0, y: 340 },
  ...column(site.work, COLUMN, 0),
  ...column(site.fun, COLUMN, funTop),
  links: { x: COLUMN, y: funTop + site.fun.length * ROW + 48 },
  "ask-puma": { x: COLUMN * 2, y: 96 },
};

export type CanvasEdge = { key: string; from: string; to: string };

function edge(from: string, to: string): CanvasEdge {
  return { key: `${from}->${to}`, from, to };
}

export const CANVAS_EDGES: CanvasEdge[] = [
  ...site.work.map((item) => edge("profile", item.slug)),
  ...site.fun.map((item) => edge("profile", item.slug)),
  edge("profile", "links"),
  ...site.work.map((item) => edge(item.slug, "ask-puma")),
];

export const EDGE_BY_KEY = new Map(CANVAS_EDGES.map((e) => [e.key, e]));

export const NODE_BY_KEY = new Map(CANVAS_NODES.map((n) => [n.key, n]));

export function hasInput(key: string) {
  return CANVAS_EDGES.some((e) => e.to === key);
}

export function hasOutput(key: string) {
  return CANVAS_EDGES.some((e) => e.from === key);
}
