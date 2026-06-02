import { ingestAllNewsInline } from "@/lib/news/ingest-inline";
(async () => {
  const r = await ingestAllNewsInline();
  console.log("RESULT:", JSON.stringify(r, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
