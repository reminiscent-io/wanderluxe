import { pgTable, text, serial, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
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

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  content: text("content").notNull(),
  isAi: boolean("is_ai").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const tripsRelations = relations(trips, ({ many }) => ({
  timelineEntries: many(timelineEntries),
  messages: many(messages),
  files: many(files),
}));

export const timelineEntriesRelations = relations(timelineEntries, ({ one }) => ({
  trip: one(trips, {
    fields: [timelineEntries.tripId],
    references: [trips.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  trip: one(trips, {
    fields: [messages.tripId],
    references: [trips.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  trip: one(trips, {
    fields: [files.tripId],
    references: [trips.id],
  }),
}));

// Schemas
export const insertTripSchema = createInsertSchema(trips);
export const selectTripSchema = createSelectSchema(trips);
export const insertTimelineEntrySchema = createInsertSchema(timelineEntries);
export const selectTimelineEntrySchema = createSelectSchema(timelineEntries);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

// Types
export type Trip = typeof trips.$inferSelect;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type File = typeof files.$inferSelect;
export type NewTimelineEntry = Omit<
  TimelineEntry,
  "id" | "createdAt" | "updatedAt" | "status" | "details" | "endTime"
>;