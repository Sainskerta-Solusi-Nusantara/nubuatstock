import { notFound } from "next/navigation";
import { getAdminResearchById } from "@/lib/research/admin";
import { ResearchForm, type ResearchFormData } from "@/components/admin/ResearchForm";

export const dynamic = "force-dynamic";

export default async function EditResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getAdminResearchById(id);
  if (!report) notFound();

  const initial: ResearchFormData = {
    id: report.id,
    slug: report.slug,
    title: report.title,
    companyKode: report.companyKode,
    reportType: report.reportType,
    rating: report.rating,
    timeHorizon: report.timeHorizon,
    currentPriceAtPublish: report.currentPriceAtPublish ? String(report.currentPriceAtPublish) : "",
    targetPrice: report.targetPrice ? String(report.targetPrice) : "",
    summary: report.summary,
    keyHighlights: report.keyHighlights ?? [],
    catalysts: report.catalysts ?? [],
    riskFactors: report.riskFactors ?? [],
    sections: report.sections ?? [],
    valuationMethod: report.valuationMethod ?? "",
    tags: report.tags ?? [],
    minTierRequired: report.minTierRequired,
    status: report.status,
  };

  return <ResearchForm initial={initial} />;
}
