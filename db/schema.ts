import { pgTable, text, serial, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
  messages: many(messages),
  files: many(files),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  messages: many(messages),
  files: many(files),
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

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTripSchema = createInsertSchema(trips);
export const selectTripSchema = createSelectSchema(trips);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type File = typeof files.$inferSelect;
