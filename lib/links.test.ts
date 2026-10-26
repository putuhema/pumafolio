import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fallbackTitle, fetchTitle, isOwnerKey, normalizeUrl } from "./links";

describe("reading list links", () => {
  const saved = process.env.OWNER_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.OWNER_KEY;
    else process.env.OWNER_KEY = saved;
  });

  it("accepts only plain http(s) URLs", () => {
    assert.equal(normalizeUrl("https://example.com/a#x")?.toString(), "https://example.com/a");
    assert.equal(normalizeUrl("javascript:alert(1)"), null);
    assert.equal(normalizeUrl("file:///etc/passwd"), null);
    assert.equal(normalizeUrl("https://user:pw@example.com"), null);
    assert.equal(normalizeUrl("not a url"), null);
  });

  it("checks the owner key and refuses when none is set", () => {
    delete process.env.OWNER_KEY;
    assert.equal(isOwnerKey("anything"), false);
    process.env.OWNER_KEY = "s3cret-key";
    assert.equal(isOwnerKey("s3cret-key"), true);
    assert.equal(isOwnerKey("s3cret-kez"), false);
    assert.equal(isOwnerKey("short"), false);
    assert.equal(isOwnerKey(null), false);
  });

  it("never fetches private or local addresses", async () => {
    for (const raw of [
      "http://localhost:3000/",
      "http://127.0.0.1/",
      "http://10.0.0.5/admin",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
    ]) {
      const url = normalizeUrl(raw)!;
      assert.equal(await fetchTitle(url), fallbackTitle(url));
    }
  });
});

describe("owner key attempts", () => {
  it("blocks an IP after 5 wrong keys in 15 minutes, for an hour", async () => {
    const { ownerBlockedFor, recordOwnerFailure, clearOwnerFailures, resetOwnerLimit } =
      await import("./links");
    resetOwnerLimit();
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) recordOwnerFailure("1.2.3.4", t0 + i);
    assert.equal(ownerBlockedFor("1.2.3.4", t0 + 10), 0);
    recordOwnerFailure("1.2.3.4", t0 + 5);
    assert.ok(ownerBlockedFor("1.2.3.4", t0 + 10) > 3500);
    assert.equal(ownerBlockedFor("5.6.7.8", t0 + 10), 0, "other IPs unaffected");
    assert.equal(ownerBlockedFor("1.2.3.4", t0 + 5 + 60 * 60 * 1000), 0, "unblocks after an hour");

    // Failures spread past 15 minutes don't add up.
    for (let i = 0; i < 8; i++) recordOwnerFailure("9.9.9.9", t0 + i * 16 * 60 * 1000);
    assert.equal(ownerBlockedFor("9.9.9.9", t0 + 8 * 16 * 60 * 1000), 0);

    // A right key clears the count.
    for (let i = 0; i < 4; i++) recordOwnerFailure("2.2.2.2", t0 + i);
    clearOwnerFailures("2.2.2.2");
    recordOwnerFailure("2.2.2.2", t0 + 10);
    assert.equal(ownerBlockedFor("2.2.2.2", t0 + 11), 0);
  });
});
