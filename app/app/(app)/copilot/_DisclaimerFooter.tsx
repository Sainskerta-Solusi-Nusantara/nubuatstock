import Link from "next/link";

export function CopilotDisclaimerFooter({ disclaimer }: { disclaimer: string }) {
  if (!disclaimer) return null;
  return (
    <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[10px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
      {disclaimer}{" "}
      <Link href="/legal/disclaimer" className="underline">
        Selengkapnya
      </Link>
    </div>
  );
}
