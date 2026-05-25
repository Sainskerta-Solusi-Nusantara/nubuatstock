import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function ResearchTab() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Research Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          title="Belum ada riset"
          description="Catatan riset internal akan muncul di sini setelah analis menerbitkan."
        />
      </CardContent>
    </Card>
  );
}
