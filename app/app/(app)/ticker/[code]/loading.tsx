import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TickerLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>

      <Skeleton className="h-9 w-full max-w-3xl" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
