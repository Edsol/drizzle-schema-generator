import { serial, text, pgSchema, primaryKey, numeric } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const mySchema = pgSchema()

export const anomalies = mySchema.table('anomalies', {
    id: serial("id").primaryKey(),
    description: text('description'),
    severity: serial('severity'),
    manager: text('manager'),
})

export const test = mySchema.table('test', {
    id: serial("id").primaryKey(),
    name: text('name'),
    anomalies_id: numeric('anomalies_id').references(() => anomalies.id)
})

export const anomaliesRelations = relations(anomalies, ({ one, many }) => ({
    tests: many(test),
}));
export const testRelations = relations(test, ({ one, many }) => ({
    anomaly: one(anomalies, {
        fields: [test.anomalies_id],
        references: [anomalies.id],
    })
}));