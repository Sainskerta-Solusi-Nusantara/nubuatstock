import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedScreens } from "@/db/schema/saved-screens";
import { requireSession } from "@/lib/auth/server";
import { handleError } from "@/lib/utils/api";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  filters: z.record(z.unknown()),
  isAlert: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await db
      .select()
      .from(savedScreens)
      .where(eq(savedScreens.userId, session.userId))
      .orderBy(asc(savedScreens.name));
    return NextResponse.json({ ok: true, data: { items: rows } });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const json = await req.json();
    const parsed = createSchema.parse(json);

    const [row] = await db
      .insert(savedScreens)
      .values({
        userId: session.userId,
        name: parsed.name,
        description: parsed.description,
        filters: parsed.filters,
        isAlert: parsed.isAlert ?? false,
      })
      .onConflictDoUpdate({
        target: [savedScreens.userId, savedScreens.name],
        set: {
          description: parsed.description,
          filters: parsed.filters,
          isAlert: parsed.isAlert ?? false,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    await db
      .delete(savedScreens)
      .where(and(eq(savedScreens.id, id), eq(savedScreens.userId, session.userId)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
