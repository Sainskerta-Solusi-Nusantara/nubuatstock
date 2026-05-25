import { ilike, or, eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../db/schema/auth";
import { userSubscriptions } from "../db/schema/billing";

async function main() {
  const found = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, emailVerified: users.emailVerified })
    .from(users)
    .where(or(ilike(users.name, "%alif%"), ilike(users.email, "%alif%")));
  console.log("Users:", JSON.stringify(found, null, 2));
  for (const u of found) {
    const subs = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, u.id));
    console.log(`Subs for ${u.email}:`, JSON.stringify(subs, null, 2));
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(99); });
