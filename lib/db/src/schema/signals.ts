import { pgTable, serial, text, real, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("trading_signals", {
  id: serial("id").primaryKey(),
  direction: text("direction").notNull(),
  entry1: real("entry1").notNull(),
  entry2: real("entry2"),
  stopLoss1: real("stop_loss1").notNull(),
  stopLoss2: real("stop_loss2"),
  takeProfit1: real("take_profit1").notNull(),
  takeProfit2: real("take_profit2"),
  score: real("score").notNull(),
  scoreBreakdown: jsonb("score_breakdown").notNull(),
  rationale: text("rationale").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;

export const priceHistoryTable = pgTable("price_history", {
  id: serial("id").primaryKey(),
  price: real("price").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertPriceHistorySchema = createInsertSchema(priceHistoryTable).omit({ id: true });
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistoryTable.$inferSelect;

export const bayesianStateTable = pgTable("bayesian_state", {
  id: serial("id").primaryKey(),
  priorLong: real("prior_long").notNull().default(0.5),
  priorShort: real("prior_short").notNull().default(0.5),
  totalSignals: integer("total_signals").notNull().default(0),
  successfulLong: integer("successful_long").notNull().default(0),
  successfulShort: integer("successful_short").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
