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
  sharerId: text("sharer_id").notNull().default(""), source: text("source").notNull().default("share"), subscriptionId: text("subscription_id").notNull().default(""),
  analysis: text("analysis").notNull().default(""), score: integer("score").notNull().default(-1),
}, t => [index("shares_date_idx").on(t.sharedAt), index("shares_notify_idx").on(t.notifyStatus,t.notifyNextAt), index("shares_source_idx").on(t.source,t.sharedAt)]);

export const usageWindows = sqliteTable("usage_windows", { key: text("key").primaryKey(), count: integer("count").notNull().default(0) });

export const users = sqliteTable('users', {
 id:text('id').primaryKey(), username:text('username').notNull().unique(), name:text('name').notNull(), passwordHash:text('password_hash').notNull(), role:text('role').notNull().default('member'), active:integer('active').notNull().default(1), mustChange:integer('must_change').notNull().default(1), version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(),
 owner:integer('owner').notNull().default(0), loginType:text('login_type').notNull().default('password'), readingStyle:text('reading_style').notNull().default('x')
});
export const sessions = sqliteTable('sessions', {hash:text('hash').primaryKey(),userId:text('user_id').notNull(),version:integer('version').notNull(),expires:integer('expires').notNull(),created:integer('created').notNull()});
export const settings = sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const authFlows = sqliteTable('auth_flows',{id:text('id').primaryKey(),userId:text('user_id').notNull(),sessionHash:text('session_hash').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),expires:integer('expires').notNull(),nextPoll:integer('next_poll').notNull().default(0)});
export const connections = sqliteTable('feishu_connections',{userId:text('user_id').primaryKey(),openId:text('open_id').notNull(),name:text('name').notNull(),tokens:text('tokens').notNull(),expires:integer('expires').notNull(),refreshLock:integer('refresh_lock').notNull().default(0),spaceId:text('space_id').notNull().default(''),spaceName:text('space_name').notNull().default(''),connectedAt:text('connected_at').notNull()});
export const wikiDays = sqliteTable('wiki_days',{id:text('id').primaryKey(),userId:text('user_id').notNull(),spaceId:text('space_id').notNull(),day:text('day').notNull(),documentId:text('document_id').notNull().default(''),nodeToken:text('node_token').notNull().default(''),url:text('url').notNull().default(''),state:text('state').notNull().default('pending'),lock:integer('lock').notNull().default(0),error:text('error').notNull().default('')});
export const wikiExports = sqliteTable('wiki_exports',{id:text('id').primaryKey(),userId:text('user_id').notNull(),shareId:text('share_id').notNull(),dayId:text('day_id').notNull(),state:text('state').notNull().default('pending'),error:text('error').notNull().default(''),createdAt:text('created_at').notNull(),finishedAt:text('finished_at').notNull().default('')});
export const userFavorites = sqliteTable('user_favorites',{id:text('id').primaryKey(),userId:text('user_id').notNull(),shareId:text('share_id').notNull()});
export const audit = sqliteTable('audit_log',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),target:text('target').notNull(),at:text('at').notNull()});
export const userTokens = sqliteTable('user_tokens',{id:text('id').primaryKey(),userId:text('user_id').notNull(),kind:text('kind').notNull(),hash:text('hash').notNull().unique(),sealed:text('sealed').notNull(),createdAt:text('created_at').notNull(),lastUsedAt:text('last_used_at').notNull().default(''),expires:integer('expires').notNull().default(0)},t=>[index('user_tokens_user_idx').on(t.userId,t.kind)]);
export const subscriptions = sqliteTable('subscriptions',{id:text('id').primaryKey(),handle:text('handle').notNull().unique(),name:text('name').notNull().default(''),avatar:text('avatar').notNull().default(''),xUserId:text('x_user_id').notNull().default(''),enabled:integer('enabled').notNull().default(1),includeReplies:integer('include_replies').notNull().default(0),includeRetweets:integer('include_retweets').notNull().default(0),focus:text('focus').notNull().default(''),lastTweetId:text('last_tweet_id').notNull().default(''),lastCheckedAt:text('last_checked_at').notNull().default(''),nextCheckAt:integer('next_check_at').notNull().default(0),lastError:text('last_error').notNull().default(''),itemCount:integer('item_count').notNull().default(0),createdAt:text('created_at').notNull(),createdBy:text('created_by').notNull().default('')});
export const dailyReports = sqliteTable('daily_reports',{day:text('day').primaryKey(),title:text('title').notNull().default(''),lead:text('lead').notNull().default(''),content:text('content').notNull().default(''),itemCount:integer('item_count').notNull().default(0),status:text('status').notNull().default('pending'),error:text('error').notNull().default(''),model:text('model').notNull().default(''),attempts:integer('attempts').notNull().default(0),lock:integer('lock').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const deliveries = sqliteTable('deliveries',{id:text('id').primaryKey(),channel:text('channel').notNull(),kind:text('kind').notNull(),targetId:text('target_id').notNull(),state:text('state').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),nextAt:integer('next_at').notNull().default(0),lease:text('lease').notNull().default(''),error:text('error').notNull().default(''),createdAt:text('created_at').notNull(),sentAt:text('sent_at').notNull().default('')},t=>[index('deliveries_state_idx').on(t.state,t.nextAt)]);
export const recoveryCodes = sqliteTable('recovery_codes',{id:text('id').primaryKey(),userId:text('user_id').notNull(),hash:text('hash').notNull().unique(),usedAt:text('used_at').notNull().default(''),createdAt:text('created_at').notNull()},t=>[index('recovery_codes_user_idx').on(t.userId)]);
