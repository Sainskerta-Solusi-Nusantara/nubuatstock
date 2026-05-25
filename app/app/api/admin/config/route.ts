import { type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { appConfig } from "@/db/schema/config";
import { handleError, ok } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const category = req.nextUrl.searchParams.get("category");
    const rows = category
      ? await db
          .select()
          .from(appConfig)
          .where(eq(appConfig.category, category))
          .orderBy(asc(appConfig.key))
      : await db.select().from(appConfig).orderBy(asc(appConfig.category), asc(appConfig.key));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}
