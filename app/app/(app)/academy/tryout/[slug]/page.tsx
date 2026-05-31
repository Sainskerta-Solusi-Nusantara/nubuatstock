import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getTryoutPackage } from "@/lib/tryout/packages";
import { TryoutRunner } from "@/components/tryout/TryoutRunner";

export const dynamic = "force-dynamic";

export default async function TryoutRunPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession();
  const { slug } = await params;
  const pkg = getTryoutPackage(slug);
  if (!pkg) notFound();

  // Sanitasi: JANGAN kirim correctIndex/explanation ke client (anti-cheat).
  // Penilaian & pembahasan dilakukan server-side setelah submit.
  const questions = pkg.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
  }));

  return (
    <TryoutRunner
      slug={pkg.slug}
      title={pkg.title}
      durationMinutes={pkg.durationMinutes}
      questions={questions}
    />
  );
}
