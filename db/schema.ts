import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const shares = sqliteTable("shares", {
  id: text("id").primaryKey(), fingerprint: text("fingerprint").notNull().unique(),
  title: text("title").notNull(), url: text("url").notNull().default(""),
  contentKind: text("content_kind").notNull().default("provided"), originalAuthor: text("original_author").notNull().default(""),
  sourceMeta: text("source_meta").notNull().default("{}"),
  original: text("original").notNull().default(""), translation: text("translation").notNull().default(""),
  summary: text("summary").notNull().default(""), tags: text("tags").notNull().default("[]"),
  category: text("category").notNull().default("新资讯"), categorySource: text("category_source").notNull().default("auto"),
  coverUrl: text("cover_url").notNull().default(""),
  collectedAt: text("collected_at").notNull().default(""), processingStartedAt: text("processing_started_at").notNull().default(""), translatedAt: text("translated_at").notNull().default(""),
  note: text("note").notNull().default(""), sharer: text("sharer").notNull().default("曾总"),
  status: text("status").notNull().default("pending"), error: text("error").notNull().default(""),
  notifyStatus: text("notify_status").notNull().default("none"),
  notifyAttempts: integer("notify_attempts").notNull().default(0),
  notifyNextAt: text("notify_next_at").notNull().default(""),
  notifyError: text("notify_error").notNull().default(""),
  notifyLease: text("notify_lease").notNull().default(""),
  notifiedAt: text("notified_at").notNull().default(""),
  favorite: integer("favorite").notNull().default(0), sharedAt: text("shared_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [index("shares_date_idx").on(t.sharedAt), index("shares_notify_idx").on(t.notifyStatus,t.notifyNextAt)]);

export const usageWindows = sqliteTable("usage_windows", { key: text("key").primaryKey(), count: integer("count").notNull().default(0) });
