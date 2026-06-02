import { refreshSecuritiesReports } from "@/lib/securities-reports/service";
(async () => {
  const r = await refreshSecuritiesReports(60);
  console.log("RESULT:", JSON.stringify(r));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
