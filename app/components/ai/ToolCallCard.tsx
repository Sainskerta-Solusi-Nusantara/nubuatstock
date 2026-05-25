"use client";

interface ToolCallCardProps {
  toolName: string;
  args?: Record<string, unknown>;
  status: "pending" | "ok" | "error";
  latencyMs?: number;
}

export function ToolCallCard({ toolName, args, status, latencyMs }: ToolCallCardProps) {
  const statusColor =
    status === "pending"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : status === "ok"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";

  return (
    <div className="my-2 rounded-md border border-zinc-200 bg-white p-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}>
          {status}
        </span>
        <span className="font-mono text-zinc-700 dark:text-zinc-200">{toolName}</span>
        {typeof latencyMs === "number" && (
          <span className="ml-auto text-[10px] text-zinc-500">{latencyMs}ms</span>
        )}
      </div>
      {args && Object.keys(args).length > 0 && (
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-50 p-1.5 text-[10px] text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  );
}
