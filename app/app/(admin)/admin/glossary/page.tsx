import { GLOSSARY_CATEGORIES, listAllGlossaryTerms } from "@/lib/glossary/admin";
import { GlossaryManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminGlossaryPage() {
  const items = await listAllGlossaryTerms();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Glossary</h1>
        <p className="text-sm text-neutral-500">
          Kamus istilah saham (CMS). Perubahan me-refresh halaman publik /glossary (ISR). Draft
          (unpublished) disembunyikan dari publik.
        </p>
      </header>

      <GlossaryManager
        items={items}
        categories={GLOSSARY_CATEGORIES as readonly string[] as string[]}
      />
    </div>
  );
}
