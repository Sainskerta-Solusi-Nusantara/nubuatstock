import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { ToolDefinition } from "./types";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { logger } from "@/lib/logger";

interface SearchCompaniesArgs {
  query: string;
  limit?: number;
}

export const searchCompaniesTool: ToolDefinition<SearchCompaniesArgs> = {
  name: "search_companies",
  description:
    "Cari emiten IDX berdasarkan nama perusahaan atau kode ticker (fuzzy partial match). Gunakan saat user menyebut perusahaan dengan nama tidak persis (mis. 'BRI' → BBRI, 'Telkom' → TLKM).",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Kata kunci pencarian (nama emiten atau bagian dari ticker).",
        minLength: 1,
        maxLength: 64,
      },
      limit: {
        type: "number",
        description: "Maksimum hasil (1-20). Default 10.",
        minimum: 1,
        maximum: 20,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async handler(args) {
    const q = (args.query ?? "").trim();
    if (q.length === 0) {
      return {
        ok: false,
        error: { code: "EMPTY_QUERY", message: "Query pencarian tidak boleh kosong." },
      };
    }
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 20);
    try {
      const pattern = `%${q}%`;
      const rows = await db
        .select({
          kode: companies.kode,
          nama: companies.namaPerusahaan,
          sektor: companies.sectorKode,
          papan: companies.papanKode,
          isSyariah: companies.isSyariah,
        })
        .from(companies)
        .where(
          and(
            eq(companies.isActive, true),
            or(ilike(companies.namaPerusahaan, pattern), ilike(companies.kode, pattern)),
          ),
        )
        .orderBy(sql`length(${companies.kode}) asc`)
        .limit(limit);

      return { ok: true, data: { count: rows.length, results: rows } };
    } catch (err) {
      logger.warn({ err, q }, "search_companies tool error");
      return {
        ok: false,
        error: {
          code: "SEARCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mencari emiten",
        },
      };
    }
  },
};
