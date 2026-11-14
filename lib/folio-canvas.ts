import {
  type CanvasRect,
  createMove,
  createViewport,
  css,
  definePrimitive,
  live,
  type MoveDraft,
  type Viewport,
} from "@ui-sdk/core";
import {
  type CanvasPoint,
  DEFAULT_POSITIONS,
  EDGE_BY_KEY,
  NODE_BY_KEY,
} from "@/lib/canvas-graph";

const STORAGE_KEY = "folio-canvas-positions-v1";
const PORT_Y = 34;

type Size = { w: number; h: number };

export type FolioCanvasController = {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetLayout: () => void;
  focusNode: (key: string) => void;
};

type FolioCanvasOptions = { controller?: FolioCanvasController };

type State = {
  viewport: Viewport;
  positions: Record<string, CanvasPoint>;
  moving: MoveDraft | null;
  sizes: Record<string, Size>;
  ready: boolean;
};

function readSaved(): Record<string, CanvasPoint> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, CanvasPoint>;
    const merged = { ...DEFAULT_POSITIONS };
    for (const key of Object.keys(DEFAULT_POSITIONS)) {
      const p = parsed[key];
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) merged[key] = p;
    }
    return merged;
  } catch {
    return null;
  }
}

function writeSaved(value: Record<string, CanvasPoint> | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be blocked; the layout just won't persist */
  }
}

function offsetOf(draft: MoveDraft | null, key: string) {
  if (!draft || !draft.keys.includes(key)) return { dx: 0, dy: 0 };
  return { dx: draft.dx, dy: draft.dy };
}

const folioCanvas = definePrimitive({
  name: "folio-canvas",
  options: { controller: "value" },
  state: (_options: FolioCanvasOptions): State => ({
    viewport: { x: 0, y: 0, zoom: 1 },
    positions: DEFAULT_POSITIONS,
    moving: null,
    sizes: {},
    ready: false,
  }),
  live: ["viewport", "moving", "sizes"],
  api: (context) => {
    const viewport = createViewport(context, {
      key: "viewport",
      surface: () => context.element("root"),
      minZoom: () => 0.2,
      maxZoom: () => 2,
      message: (zoom) => `Canvas at ${Math.round(zoom * 100)} percent`,
    });

    const move = createMove(context, {
      key: "positions",
      draft: "moving",
      set: (value) => {
        context.store.set({ positions: value });
        writeSaved(value);
        return true;
      },
      step: () => 8,
      scale: () => viewport.get().zoom,
      label: (key) => NODE_BY_KEY.get(key)?.title,
    });

    function sizeOf(key: string): Size {
      const known = context.store.get().sizes[key];
      if (known) return known;
      const el = context.element("node", key);
      return { w: el?.offsetWidth ?? 280, h: el?.offsetHeight ?? 120 };
    }

    function rectOf(key: string): CanvasRect {
      const p = context.store.get().positions[key];
      const s = sizeOf(key);
      return { left: p.x, top: p.y, right: p.x + s.w, bottom: p.y + s.h };
    }

    function bounds(): CanvasRect {
      const rects = Object.keys(context.store.get().positions).map(rectOf);
      return {
        left: Math.min(...rects.map((r) => r.left)),
        top: Math.min(...rects.map((r) => r.top)),
        right: Math.max(...rects.map((r) => r.right)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
      };
    }

    const fit = () => viewport.fit(bounds(), { padding: 56, maxZoom: 1 });

    // A phone can't show the whole graph legibly, so open on the start node and let people pan.
    const open = () => {
      const surface = context.element("root");
      if (!surface || surface.clientWidth >= 880) return fit();
      const zoom = 0.85;
      const r = rectOf("profile");
      viewport.setViewport({
        x: 16 - r.left * zoom,
        y: surface.clientHeight / 2 - ((r.top + r.bottom) / 2) * zoom,
        zoom,
      });
    };

    return {
      viewport,
      move,
      fit,
      nodeElement: (key: string) => context.element("node", key),
      zoomIn: () => viewport.zoomBy(1.2),
      zoomOut: () => viewport.zoomBy(1 / 1.2),
      focusNode: (key: string) =>
        viewport.fit(rectOf(key), { padding: 48, maxZoom: 1 }),
      resetLayout: () => {
        writeSaved(null);
        context.store.set({ positions: DEFAULT_POSITIONS });
        requestAnimationFrame(open);
      },
      start: () => {
        const saved = readSaved();
        if (saved) context.store.set({ positions: saved });
        requestAnimationFrame(() => {
          open();
          context.store.set({ ready: true });
        });
      },
      measure: (key: string, size: Size) => {
        const sizes = context.store.get().sizes;
        const prev = sizes[key];
        if (prev && prev.w === size.w && prev.h === size.h) return;
        context.store.set({ sizes: { ...sizes, [key]: size } });
      },
      edgePath: (state: State, key: string) => {
        const edge = EDGE_BY_KEY.get(key);
        if (!edge) return undefined;
        const a = state.positions[edge.from];
        const b = state.positions[edge.to];
        const sa = state.sizes[edge.from];
        if (!a || !b || !sa || !state.sizes[edge.to]) return undefined;
        const oa = offsetOf(state.moving, edge.from);
        const ob = offsetOf(state.moving, edge.to);
        const x1 = a.x + oa.dx + sa.w;
        const y1 = a.y + oa.dy + PORT_Y;
        const x2 = b.x + ob.dx;
        const y2 = b.y + ob.dy + PORT_Y;
        const bend = Math.max(48, Math.abs(x2 - x1) / 2);
        return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "region",
      attrs: (state) => ({
        tabindex: "0",
        "data-ready": state.ready ? "" : undefined,
      }),
      live: live((state) => {
        const { x, y, zoom } = state.viewport;
        return {
          style: css({
            "--grid-x": `${x}px`,
            "--grid-y": `${y}px`,
            "--grid-size": `${24 * zoom}px`,
          }),
        };
      }),
      bind: (_el, part) => part.api.start(),
      on: {
        wheel: (event, { api }) => {
          const wheel = event as WheelEvent;
          const target = wheel.target as Element | null;
          if (!wheel.ctrlKey && target?.closest("[data-canvas-scroll]")) return;
          api.viewport.wheel(wheel);
        },
        pointerdown: (event, { el, api }) => {
          if (event.target === el) api.viewport.pointerdown(event as PointerEvent);
        },
        keydown: (event, { el, api }) => {
          if (event.target !== el) return;
          const key = event as KeyboardEvent;
          if (key.key === "f" && !key.metaKey && !key.ctrlKey) {
            key.preventDefault();
            api.fit();
            return;
          }
          api.viewport.keydown(key);
        },
      },
    }),
    pane: slot({
      bind: (el, part) => part.api.viewport.bindFindable(el),
    }),
    world: slot({
      live: live((state, { api }) => ({ style: api.viewport.style(state) })),
    }),
    edge: slot<{ value: string }>({
      props: { value: "string" },
      live: live((state, { api, key }) => {
        const d = api.edgePath(state, key);
        const edge = EDGE_BY_KEY.get(key);
        const active =
          !!edge &&
          !!state.moving &&
          (state.moving.keys.includes(edge.from) ||
            state.moving.keys.includes(edge.to));
        return {
          d: d ?? "M 0 0",
          "data-hidden": d ? undefined : "",
          "data-active": active ? "" : undefined,
        };
      }),
    }),
    node: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (state, { key }) => {
        const p = state.positions[key] ?? { x: 0, y: 0 };
        return { style: css({ left: `${p.x}px`, top: `${p.y}px` }) };
      },
      live: live((state, { api, key }) => ({
        "data-dragging": api.move.dragging(state, key) ? "" : undefined,
        style: api.move.style(state, key),
      })),
      bind: (el, part) => {
        const report = () =>
          part.api.measure(part.key, { w: el.offsetWidth, h: el.offsetHeight });
        report();
        const observer = new ResizeObserver(report);
        observer.observe(el);
        return () => observer.disconnect();
      },
    }),
    handle: slot<{ value: string }>({
      props: { value: "string" },
      attrs: () => ({ type: "button" }),
      on: {
        pointerdown: (event, { api, key }) => {
          const node = api.nodeElement(key);
          if (node) api.move.pointerdown(event as PointerEvent, key, node);
        },
        keydown: (event, { api, key }) => {
          api.move.keydown(event as KeyboardEvent, key);
        },
        dblclick: (_event, { api, key }) => api.focusNode(key),
      },
    }),
    "zoom-label": slot<object, { percent: number }>({
      state: (state) => ({ percent: Math.round(state.viewport.zoom * 100) }),
    }),
  }),
});

export { folioCanvas };
