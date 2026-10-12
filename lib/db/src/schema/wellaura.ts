import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const wellauraRecordsTable = pgTable(
  "wellaura_records",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    profileId: text("profile_id").notNull(),
    kind: text("kind").notNull(),
    parentId: text("parent_id"),
    encryptedPayload: text("encrypted_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("wellaura_records_owner_idx").on(table.ownerId),
    index("wellaura_records_profile_kind_idx").on(
      table.ownerId,
      table.profileId,
      table.kind,
    ),
    index("wellaura_records_parent_idx").on(
      table.ownerId,
      table.parentId,
    ),
  ],
);

