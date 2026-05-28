import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userLegalAcceptances } from "@/db/schema/legal-acceptance";
import { getConfig } from "@/lib/config";

export type LegalDocumentType = "disclaimer" | "terms" | "privacy";

export const LEGAL_DOCUMENT_TYPES: readonly LegalDocumentType[] = [
  "disclaimer",
  "terms",
  "privacy",
] as const;

/**
 * Versi default per dokumen legal. Sumber-of-truth versi terkini ada di
 * `app_config` (key `legal.<doc>.version`) supaya superadmin bisa bump versi
 * tanpa deploy — saat versi di-bump, semua user wajib re-accept.
 *
 * Konstanta ini hanya fallback kalau config belum di-seed / DB unreachable.
 */
export const DEFAULT_LEGAL_VERSIONS: Record<LegalDocumentType, string> = {
  disclaimer: "v1",
  terms: "v1",
  privacy: "v1",
};

/**
 * Backward-compat: dipakai komponen/test lama yang assume single version.
 * Mengacu ke versi disclaimer default.
 */
export const CURRENT_LEGAL_VERSION = DEFAULT_LEGAL_VERSIONS.disclaimer;

const CONFIG_KEY: Record<LegalDocumentType, string> = {
  disclaimer: "legal.disclaimer.version",
  terms: "legal.terms.version",
  privacy: "legal.privacy.version",
};

/**
 * Parse versi string ("v1", "v1.2", "2.0.1", "1") jadi tuple angka untuk
 * dibandingkan secara semantik. Prefix "v" diabaikan. Token non-numerik
 * jadi 0 supaya perbandingan tetap deterministik (tidak throw).
 */
export function parseVersion(version: string): number[] {
  const cleaned = version.trim().replace(/^v/i, "");
  const parts = cleaned.split(".").map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
  return parts.length > 0 ? parts : [0];
}

/**
 * Bandingkan dua versi. Return:
 *   < 0  jika a lebih lama dari b
 *     0  jika sama
 *   > 0  jika a lebih baru dari b
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db_ = pb[i] ?? 0;
    if (da !== db_) return da - db_;
  }
  return 0;
}

/**
 * Versi terkini sebuah dokumen legal (dari config, fallback ke default konstanta).
 */
export async function getCurrentLegalVersion(
  documentType: LegalDocumentType,
): Promise<string> {
  return getConfig<string>(CONFIG_KEY[documentType], {
    defaultValue: DEFAULT_LEGAL_VERSIONS[documentType],
  });
}

/**
 * Versi tertinggi yang pernah di-accept user untuk satu dokumen.
 * Return null kalau user belum pernah accept dokumen ini sama sekali.
 */
async function getAcceptedVersion(
  userId: string,
  documentType: LegalDocumentType,
): Promise<string | null> {
  const rows = await db
    .select({ documentVersion: userLegalAcceptances.documentVersion })
    .from(userLegalAcceptances)
    .where(
      and(
        eq(userLegalAcceptances.userId, userId),
        eq(userLegalAcceptances.documentType, documentType),
      ),
    )
    .orderBy(desc(userLegalAcceptances.acceptedAt));

  if (rows.length === 0) return null;

  // Ambil versi tertinggi secara semantik (bukan sekadar yang terbaru waktunya),
  // supaya re-accept versi lama tidak menurunkan status user.
  let highest = rows[0]!.documentVersion;
  for (const r of rows) {
    if (compareVersions(r.documentVersion, highest) > 0) {
      highest = r.documentVersion;
    }
  }
  return highest;
}

/**
 * Apakah user sudah accept versi terkini (atau lebih baru) dari sebuah dokumen.
 *
 * Mengembalikan FALSE bila:
 *   - user belum pernah accept dokumen ini (first accept), ATAU
 *   - versi yang di-accept user < versi terkini (perlu re-accept).
 *
 * Fail-open kalau DB error.
 */
export async function hasAcceptedDocument(
  userId: string,
  documentType: LegalDocumentType,
): Promise<boolean> {
  try {
    const [current, accepted] = await Promise.all([
      getCurrentLegalVersion(documentType),
      getAcceptedVersion(userId, documentType),
    ]);
    if (accepted === null) return false;
    return compareVersions(accepted, current) >= 0;
  } catch {
    return true; // fail-open
  }
}

/**
 * Cek apakah user sudah menerima disclaimer versi terkini.
 * Return false kalau belum atau versi yang di-accept sudah usang (re-accept).
 * Fail-open kalau DB error.
 */
export async function hasAcceptedDisclaimer(userId: string): Promise<boolean> {
  return hasAcceptedDocument(userId, "disclaimer");
}

/**
 * Cek apakah user sudah menerima SEMUA dokumen legal versi terkini.
 * False kalau ada minimal satu dokumen yang belum / usang.
 */
export async function hasAcceptedAllLegal(userId: string): Promise<boolean> {
  const results = await Promise.all(
    LEGAL_DOCUMENT_TYPES.map((doc) => hasAcceptedDocument(userId, doc)),
  );
  return results.every(Boolean);
}

/**
 * Status detail untuk UI gate: apakah perlu accept, dan apakah ini RE-accept
 * (user pernah accept versi lebih lama) vs first accept.
 */
export interface LegalGateStatus {
  needsAcceptance: boolean;
  /** true kalau user sudah pernah accept versi lebih lama (kebijakan di-update). */
  isReAccept: boolean;
  /** versi terkini per dokumen yang harus di-accept user. */
  currentVersions: Record<LegalDocumentType, string>;
  /** versi disclaimer terkini (untuk dikirim ke endpoint accept). */
  currentVersion: string;
}

/**
 * Resolusi status gate legal untuk dipakai di layout/server component.
 * Fail-open: kalau DB error, anggap tidak perlu accept (tidak block user).
 */
export async function getLegalGateStatus(userId: string): Promise<LegalGateStatus> {
  const fallback: LegalGateStatus = {
    needsAcceptance: false,
    isReAccept: false,
    currentVersions: { ...DEFAULT_LEGAL_VERSIONS },
    currentVersion: DEFAULT_LEGAL_VERSIONS.disclaimer,
  };

  try {
    const currentVersions = {} as Record<LegalDocumentType, string>;
    await Promise.all(
      LEGAL_DOCUMENT_TYPES.map(async (doc) => {
        currentVersions[doc] = await getCurrentLegalVersion(doc);
      }),
    );

    const acceptedRows = await db
      .select({
        documentType: userLegalAcceptances.documentType,
        documentVersion: userLegalAcceptances.documentVersion,
      })
      .from(userLegalAcceptances)
      .where(
        and(
          eq(userLegalAcceptances.userId, userId),
          inArray(
            userLegalAcceptances.documentType,
            LEGAL_DOCUMENT_TYPES as unknown as string[],
          ),
        ),
      );

    // Versi tertinggi yang di-accept per dokumen.
    const acceptedHighest = new Map<string, string>();
    for (const r of acceptedRows) {
      const prev = acceptedHighest.get(r.documentType);
      if (!prev || compareVersions(r.documentVersion, prev) > 0) {
        acceptedHighest.set(r.documentType, r.documentVersion);
      }
    }

    let needsAcceptance = false;
    let hasAnyOutdated = false;
    for (const doc of LEGAL_DOCUMENT_TYPES) {
      const accepted = acceptedHighest.get(doc) ?? null;
      if (accepted === null) {
        needsAcceptance = true; // first accept
      } else if (compareVersions(accepted, currentVersions[doc]) < 0) {
        needsAcceptance = true;
        hasAnyOutdated = true; // re-accept (versi usang)
      }
    }

    return {
      needsAcceptance,
      isReAccept: hasAnyOutdated,
      currentVersions,
      currentVersion: currentVersions.disclaimer,
    };
  } catch {
    return fallback;
  }
}

export async function recordAcceptance(opts: {
  userId: string;
  documentType: LegalDocumentType;
  version: string;
  ip?: string;
  userAgent?: string;
}) {
  await db
    .insert(userLegalAcceptances)
    .values({
      userId: opts.userId,
      documentType: opts.documentType,
      documentVersion: opts.version,
      ipAddress: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
    })
    .onConflictDoNothing({
      target: [
        userLegalAcceptances.userId,
        userLegalAcceptances.documentType,
        userLegalAcceptances.documentVersion,
      ],
    });
}
