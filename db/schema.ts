import { pgTable, text, serial, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: integer("budget"),
  status: text("status").default("planning"),
  details: json("details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const timelineEntries = pgTable("timeline_entries", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"),
  type: text("type").notNull(), // e.g., 'flight', 'activity', 'accommodation'
  status: text("status").default("planned"),
  suggested: boolean("suggested").default(false),
  details: json("details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  userId: integer("user_id").references(() => users.id),
  role: text("role").default("viewer"), // 'owner', 'editor', 'viewer'
  inviteStatus: text("invite_status").default("pending"), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  isAi: boolean("is_ai").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  userId: integer("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
  collaborations: many(collaborators),
  messages: many(messages),
  files: many(files),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  timelineEntries: many(timelineEntries),
  collaborators: many(collaborators),
  messages: many(messages),
  files: many(files),
}));

export const timelineEntriesRelations = relations(timelineEntries, ({ one }) => ({
  trip: one(trips, {
    fields: [timelineEntries.tripId],
    references: [trips.id],
  }),
}));

export const collaboratorsRelations = relations(collaborators, ({ one }) => ({
  trip: one(trips, {
    fields: [collaborators.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [collaborators.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  trip: one(trips, {
    fields: [messages.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  trip: one(trips, {
    fields: [files.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTripSchema = createInsertSchema(trips);
export const selectTripSchema = createSelectSchema(trips);
export const insertTimelineEntrySchema = createInsertSchema(timelineEntries);
export const selectTimelineEntrySchema = createSelectSchema(timelineEntries);
export const insertCollaboratorSchema = createInsertSchema(collaborators);
export const selectCollaboratorSchema = createSelectSchema(collaborators);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

// Types
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type Collaborator = typeof collaborators.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type File = typeof files.$inferSelect;
export type NewTimelineEntry = Omit<
  TimelineEntry,
  "id" | "createdAt" | "updatedAt" | "status" | "details" | "endTime"
>;