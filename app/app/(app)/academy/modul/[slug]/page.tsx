import { notFound } from "next/navigation";
import { getModuleBySlug } from "@/lib/academy/content";
import { ModuleDetail } from "@/components/academy/ModuleDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = getModuleBySlug(slug);
  if (!mod) return { title: "Modul — Academy | Nubuat" };
  return { title: `${mod.title} — Academy | Nubuat`, description: mod.description };
}

export default async function AcademyModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = getModuleBySlug(slug);
  if (!mod) notFound();

  return (
    <ModuleDetail
      slug={mod.slug}
      title={mod.title}
      description={mod.description}
      level={mod.level}
      lessons={mod.lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        readMinutes: l.readMinutes,
      }))}
    />
  );
}
