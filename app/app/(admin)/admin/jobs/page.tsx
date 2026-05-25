import Link from "next/link";
import { JobsBoard } from "./board";

export const dynamic = "force-dynamic";

export default function AdminJobsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Jobs Queue</h1>
          <p className="text-sm text-neutral-500">
            Overview BullMQ queues. Detail control & retry tersedia via API admin (Agent 11):
            <Link
              href="/api/admin/jobs"
              className="font-mono text-xs ml-2 text-neutral-700 hover:underline"
            >
              /api/admin/jobs
            </Link>
          </p>
        </div>
        <Link
          href="/admin/jobs/schedule"
          className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Schedules
        </Link>
      </header>
      <JobsBoard />
    </div>
  );
}
