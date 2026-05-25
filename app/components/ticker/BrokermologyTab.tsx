import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function BrokermologyTab({ ticker }: { ticker: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Top Broker Aktivitas</CardTitle>
        <CardDescription>
          Top 10 buyer/seller dari broker summary IDX. Fitur tier Pro+.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Broker summary belum tersedia"
          description={`Vendor data broker untuk ${ticker} perlu di-setup admin.`}
          action={{ href: "/subscription", label: "Lihat paket Pro" }}
        />
      </CardContent>
    </Card>
  );
}
