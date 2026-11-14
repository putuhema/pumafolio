"use client";

import { createController } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/react/primitive";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@ui-sdk/react/toolbar";
import {
  ArrowUpRightIcon,
  FullscreenIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ChatDock } from "@/components/chat";
import {
  CANVAS_EDGES,
  CANVAS_NODES,
  type CanvasNode,
  hasInput,
  hasOutput,
  KIND_LABEL,
} from "@/lib/canvas-graph";
import { type FolioCanvasController, folioCanvas } from "@/lib/folio-canvas";
import { site } from "@/lib/site";

const Canvas = createParts(folioCanvas, {
  root: "div",
  pane: "div",
  world: "div",
  edge: "path",
  node: "article",
  handle: "button",
  "zoom-label": "span",
});

function subscribePalm(onStoreChange: () => void) {
  const mq = window.matchMedia("(max-width: 879px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function usePalm() {
  return useSyncExternalStore(
    subscribePalm,
    () => window.matchMedia("(max-width: 879px)").matches,
    () => false,
  );
}

function ProjectBody({ node }: { node: CanvasNode }) {
  const item = node.item!;
  return (
    <>
      <p className="node-desc">{item.description}</p>
      {item.href ? (
        <a className="node-link" href={item.href} target="_blank" rel="noreferrer">
          view
          <ArrowUpRightIcon aria-hidden="true" />
          <span className="sr-only"> {item.name}</span>
        </a>
      ) : (
        <span className="node-link pending" title="No public link yet">
          private
        </span>
      )}
    </>
  );
}

function ProfileBody() {
  return (
    <>
      <p className="node-tagline">{site.tagline}</p>
      <p className="node-meta">{site.location}</p>
      <p className="node-meta">{site.stack}</p>
    </>
  );
}

function LinksBody() {
  return (
    <ul className="node-links">
      <li>
        <a href={site.github} rel="me noreferrer">
          github
        </a>
      </li>
      <li>
        <a href={site.linkedin} rel="me noreferrer">
          linkedin
        </a>
      </li>
      <li>
        <a href={`mailto:${site.email}`}>email</a>
      </li>
      <li>
        {site.cv.href ? (
          <a href={site.cv.href}>cv</a>
        ) : (
          <span className="pending" title="CV PDF not linked yet">
            cv
            <span className="sr-only">, PDF not linked yet</span>
          </span>
        )}
      </li>
      <li>
        <Link href="/saved">saved articles</Link>
      </li>
    </ul>
  );
}

function AgentBody({ palm }: { palm: boolean }) {
  if (palm) {
    return (
      <p className="node-desc">
        Puma knows my projects, stack and how to reach me. Tap{" "}
        <strong>ask puma</strong> at the bottom of the screen.
      </p>
    );
  }
  return (
    <div className="node-chat" data-canvas-scroll="">
      <ChatDock embedded />
    </div>
  );
}

function NodeCard({ node, palm }: { node: CanvasNode; palm: boolean }) {
  const titleId = `node-${node.key}-title`;
  let body: ReactNode;
  if (node.kind === "profile") body = <ProfileBody />;
  else if (node.kind === "links") body = <LinksBody />;
  else if (node.kind === "agent") body = <AgentBody palm={palm} />;
  else body = <ProjectBody node={node} />;

  const Title = node.kind === "profile" ? "h1" : "h2";

  return (
    <Canvas.Node
      value={node.key}
      id={node.key}
      aria-labelledby={titleId}
      data-kind={node.kind}
      data-palm={palm ? "" : undefined}
      data-in={hasInput(node.key) ? "" : undefined}
      data-out={hasOutput(node.key) ? "" : undefined}
    >
      <header className="node-head">
        <Canvas.Handle
          value={node.key}
          className="node-grip"
          aria-label={`Move ${node.title}`}
          aria-describedby="canvas-help"
          title="Drag to move, double-click to focus"
        >
          <span aria-hidden="true">⋮⋮</span>
        </Canvas.Handle>
        <span className="node-kind">{KIND_LABEL[node.kind]}</span>
      </header>
      <div className="node-body">
        <Title id={titleId} className="node-title">
          {node.title}
        </Title>
        {body}
      </div>
    </Canvas.Node>
  );
}

export function FolioCanvas() {
  const palm = usePalm();
  const [controller] = useState(() => createController<FolioCanvasController>());

  return (
    <>
      <Canvas.Root
        controller={controller}
        className="canvas"
        aria-label={`${site.name}'s portfolio canvas`}
        aria-describedby="canvas-help"
      >
        <Canvas.Pane className="canvas-pane">
          <Canvas.World className="canvas-world">
            <svg className="canvas-edges" aria-hidden="true">
              {CANVAS_EDGES.map((edge) => (
                <Canvas.Edge key={edge.key} value={edge.key} className="edge" />
              ))}
            </svg>
            {CANVAS_NODES.map((node) => (
              <NodeCard key={node.key} node={node} palm={palm} />
            ))}
          </Canvas.World>
        </Canvas.Pane>

        <Toolbar aria-label="Canvas view" className="canvas-toolbar">
          <ToolbarButton aria-label="Zoom out" onClick={() => controller.zoomOut()}>
            <MinusIcon aria-hidden="true" />
          </ToolbarButton>
          <Canvas.ZoomLabel className="canvas-zoom" aria-hidden="true">
            {({ percent }) => `${percent}%`}
          </Canvas.ZoomLabel>
          <ToolbarButton aria-label="Zoom in" onClick={() => controller.zoomIn()}>
            <PlusIcon aria-hidden="true" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton aria-label="Fit everything" onClick={() => controller.fit()}>
            <FullscreenIcon aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            aria-label="Reset layout"
            onClick={() => controller.resetLayout()}
          >
            <RotateCcwIcon aria-hidden="true" />
          </ToolbarButton>
          {!palm ? (
            <>
              <ToolbarSeparator />
              <ToolbarButton onClick={() => controller.focusNode("ask-puma")}>
                ask puma
              </ToolbarButton>
            </>
          ) : null}
        </Toolbar>

        <p id="canvas-help" className="canvas-help">
          Drag empty space to pan, pinch or ⌘/Ctrl + scroll to zoom. Drag a
          card&rsquo;s grip to move it, or focus the grip and press Alt + arrows.
        </p>
      </Canvas.Root>
      {palm ? <ChatDock /> : null}
    </>
  );
}
