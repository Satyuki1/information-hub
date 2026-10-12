import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const shares = sqliteTable("shares", {
  id: text("id").primaryKey(), fingerprint: text("fingerprint").notNull().unique(),
  title: text("title").notNull(), url: text("url").notNull().default(""),
  original: text("original").notNull().default(""), translation: text("translation").notNull().default(""),
  summary: text("summary").notNull().default(""), tags: text("tags").notNull().default("[]"),
  note: text("note").notNull().default(""), sharer: text("sharer").notNull().default("曾总"),
  status: text("status").notNull().default("pending"), error: text("error").notNull().default(""),
  favorite: integer("favorite").notNull().default(0), sharedAt: text("shared_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [index("shares_date_idx").on(t.sharedAt)]);
