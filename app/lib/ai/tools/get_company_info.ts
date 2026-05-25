import { eq } from "drizzle-orm";
import type { ToolDefinition } from "./types";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { sectors, papanListing } from "@/db/schema/reference";
import { logger } from "@/lib/logger";

interface GetCompanyInfoArgs {
  kode: string;
}

export const getCompanyInfoTool: ToolDefinition<GetCompanyInfoArgs> = {
  name: "get_company_info",
  description:
    "Ambil profil emiten IDX (nama perusahaan, sektor, sub-sektor, papan pencatatan, IPO date, market cap, free float, status syariah). Gunakan saat user bertanya 'apa itu BBRI?', 'siapa BBCA?', atau perlu konteks fundamental dasar.",
  parameters: {
    type: "object",
    properties: {
      kode: {
        type: "string",
        description: "Kode ticker IDX uppercase (mis. BBRI).",
        pattern: "^[A-Z0-9]{3,6}$",
      },
    },
    required: ["kode"],
    additionalProperties: false,
  },
  async handler(args) {
    const kode = args.kode?.toUpperCase?.();
    if (!kode || !/^[A-Z0-9]{3,6}$/.test(kode)) {
      return {
        ok: false,
        error: { code: "INVALID_TICKER", message: "Format ticker tidak valid." },
      };
    }
    try {
      const rows = await db
        .select({
          kode: companies.kode,
          namaPerusahaan: companies.namaPerusahaan,
          papanKode: companies.papanKode,
          papanNama: papanListing.nama,
          sectorKode: companies.sectorKode,
          sectorNamaId: sectors.namaId,
          sectorNamaEn: sectors.namaEn,
          subSectorKode: companies.subSectorKode,
          tanggalIpo: companies.tanggalIpo,
          sharesOutstanding: companies.sharesOutstanding,
          marketCapIdr: companies.marketCapIdr,
          freeFloatPct: companies.freeFloatPct,
          isActive: companies.isActive,
          isSyariah: companies.isSyariah,
          website: companies.website,
          deskripsi: companies.deskripsi,
        })
        .from(companies)
        .leftJoin(papanListing, eq(companies.papanKode, papanListing.kode))
        .leftJoin(sectors, eq(companies.sectorKode, sectors.kode))
        .where(eq(companies.kode, kode))
        .limit(1);

      if (rows.length === 0) {
        return {
          ok: false,
          error: {
            code: "COMPANY_NOT_FOUND",
            message: `Emiten ${kode} tidak ditemukan di database. Pastikan kode benar.`,
          },
        };
      }
      const r = rows[0]!;
      return {
        ok: true,
        data: {
          kode: r.kode,
          nama: r.namaPerusahaan,
          papan: { kode: r.papanKode, nama: r.papanNama },
          sektor: { kode: r.sectorKode, namaId: r.sectorNamaId, namaEn: r.sectorNamaEn },
          subSektor: r.subSectorKode,
          ipo: r.tanggalIpo,
          sharesOutstanding: r.sharesOutstanding ? r.sharesOutstanding.toString() : null,
          marketCapIdr: r.marketCapIdr,
          freeFloatPct: r.freeFloatPct,
          isActive: r.isActive,
          isSyariah: r.isSyariah,
          website: r.website,
          deskripsi: r.deskripsi,
        },
      };
    } catch (err) {
      logger.warn({ err, kode }, "get_company_info tool error");
      return {
        ok: false,
        error: {
          code: "COMPANY_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Gagal mengambil info emiten",
        },
      };
    }
  },
};
