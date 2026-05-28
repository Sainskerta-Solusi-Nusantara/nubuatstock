import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import {
  createGlossaryTerm,
  createGlossaryTermSchema,
  listAllGlossaryTerms,
} from "@/lib/glossary/admin";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/types/admin";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../_lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listAllGlossaryTerms();
    return ok(items);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = createGlossaryTermSchema.parse(await req.json());
    const created = await createGlossaryTerm(body);

    // Refresh ISR halaman publik.
    revalidatePath("/glossary");
    if (created.published) revalidatePath(`/glossary/${created.slug}`);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.GLOSSARY_TERM_CREATE,
      targetType: "glossary_term",
      targetId: created.slug,
      after: { slug: created.slug, term: created.term, published: created.published },
    });

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
