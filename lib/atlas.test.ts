import assert from "node:assert/strict";
import { test } from "node:test";
import { EDGES, NODES, VIEW, depthOf, neighbourhood } from "./atlas";
import { site } from "./site";

test("every edge joins two nodes that exist", () => {
  const ids = new Set(NODES.map((node) => node.id));
  for (const edge of EDGES) {
    assert.ok(ids.has(edge.from), `missing ${edge.from}`);
    assert.ok(ids.has(edge.to), `missing ${edge.to}`);
  }
});

test("node ids are unique and inside the map", () => {
  assert.equal(new Set(NODES.map((node) => node.id)).size, NODES.length);
  for (const node of NODES) {
    assert.ok(node.x >= 0 && node.x <= VIEW.width, node.id);
    assert.ok(node.y >= 0 && node.y <= VIEW.height, node.id);
  }
});

test("every project from the site config is on the map and reachable", () => {
  for (const item of [...site.work, ...site.fun]) {
    assert.ok(NODES.some((node) => node.id === item.slug), item.slug);
    assert.ok(depthOf(item.slug) >= 2, `${item.slug} hangs off a path`);
  }
});

test("a path's neighbourhood holds the root and its leaves", () => {
  const lit = neighbourhood("p3");
  assert.ok(lit.has("root"));
  assert.ok(lit.has("jujurnal"));
  assert.ok(!lit.has("simha"));
});
