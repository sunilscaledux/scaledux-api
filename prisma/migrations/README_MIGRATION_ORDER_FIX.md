# Migration order fix

The initial migration was renamed from `20260222094609_inital_migration` to `20250101000000_inital_migration` so it runs **before** the reviews migration (which references `scd_users`). That fixes the shadow database error: "The underlying table for model `scd_users` does not exist."

**If your database already had migrations applied** with the old name, run this once so Prisma recognizes the rename:

```sql
UPDATE _prisma_migrations
SET migration_name = '20250101000000_inital_migration'
WHERE migration_name = '20260222094609_inital_migration';
```

Then run `npx prisma migrate dev` again (e.g. for new migrations like withdrawal methods).
