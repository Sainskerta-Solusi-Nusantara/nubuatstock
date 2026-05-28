import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import {
  deleteGlossaryTerm,
  getGlossaryTermByIdAdmin,
  setGlossaryTermPublished,
  togglePublishedSchema,
  updateGlossaryTerm,
  updateGlossaryTermSchema,
} from "@/lib/glossary/admin";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/types/admin";
import { NotFoundError } from "@/lib/errors";
import { handleError, ok } from "@/lib/utils/api";
import { adminAudit } from "../../_lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Revalidate halaman publik glossary + halaman slug yang terdampak. */
function revalidateGlossary(...slugs: (string | null | undefined)[]) {
  revalidatePath("/glossary");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/glossary/${slug}`);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await getGlossaryTermByIdAdmin(id);
    if (!existing) throw new NotFoundError("Glossary term");

    const raw = await req.json();

    // Mode toggle published (body hanya { published }) → endpoint ringan.
    const keys = Object.keys(raw ?? {});
    if (keys.length === 1 && keys[0] === "published") {
      const { published } = togglePublishedSchema.parse(raw);
      const updated = await setGlossaryTermPublished(id, published);
      revalidateGlossary(existing.slug, updated?.slug);

      await adminAudit({
        actorUserId: session.user.id,
        action: ADMIN_AUDIT_ACTIONS.GLOSSARY_TERM_PUBLISH,
        targetType: "glossary_term",
        targetId: existing.slug,
        before: { published: existing.published },
        after: { published },
      });
      return ok(updated);
    }

    const body = updateGlossaryTermSchema.parse(raw);
    const updated = await updateGlossaryTerm(id, body);
    if (!updated) throw new NotFoundError("Glossary term");

    revalidateGlossary(existing.slug, updated.slug);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.GLOSSARY_TERM_UPDATE,
      targetType: "glossary_term",
      targetId: updated.slug,
      before: {
        slug: existing.slug,
        term: existing.term,
        category: existing.category,
        published: existing.published,
      },
      after: {
        slug: updated.slug,
        term: updated.term,
        category: updated.category,
        published: updated.published,
      },
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await getGlossaryTermByIdAdmin(id);
    if (!existing) throw new NotFoundError("Glossary term");

    const deleted = await deleteGlossaryTerm(id);
    if (!deleted) throw new NotFoundError("Glossary term");

    revalidateGlossary(deleted.slug);

    await adminAudit({
      actorUserId: session.user.id,
      action: ADMIN_AUDIT_ACTIONS.GLOSSARY_TERM_DELETE,
      targetType: "glossary_term",
      targetId: deleted.slug,
      before: { slug: existing.slug, term: existing.term },
    });

    return ok({ id, slug: deleted.slug, deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
