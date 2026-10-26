import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /** Putu's public reading list. Only the owner key can add or mark links. */
  links: defineTable({
    url: v.string(),
    title: v.string(),
    savedAt: v.number(),
    /** Set when Putu marks it read; unread links have no value. */
    readAt: v.optional(v.number()),
  })
    .index("by_url", ["url"])
    .index("by_savedAt", ["savedAt"]),
});
