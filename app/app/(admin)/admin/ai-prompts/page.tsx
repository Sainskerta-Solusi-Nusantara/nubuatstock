import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiPrompts } from "@/db/schema/ai";
import { AiPromptsManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminAiPromptsPage() {
  const rows = await db
    .select()
    .from(aiPrompts)
    .orderBy(asc(aiPrompts.key), desc(aiPrompts.createdAt));

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = groups.get(r.key) ?? [];
    list.push(r);
    groups.set(r.key, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">AI Prompts</h1>
        <p className="text-sm text-neutral-500">
          System prompts versioned & immutable. Aktivasi versi tertentu untuk apply ke runtime
          AI Copilot.
        </p>
      </header>

      <AiPromptsManager
        groups={Array.from(groups.entries()).map(([key, items]) => ({
          key,
          versions: items.map((r) => ({
            id: r.id,
            version: r.version,
            content: r.content,
            isActive: r.isActive,
            description: r.description,
            createdAt: r.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
