import { sql } from "drizzle-orm";
import { customType, jsonb, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Shared building blocks untuk semua schema.
 *
 * - `ulid()` — primary key column dengan default = SQL function gen_ulid().
 * - `withTimestamps` — mixin `created_at` & `updated_at`.
 * - `softDelete` — mixin `deleted_at`.
 * - `jsonbT<T>()` — typed jsonb column.
 *
 * Catatan: ULID function di-create via custom SQL migration sebelum table apapun.
 * Lihat db/migrations/0000_setup.sql (akan auto-generated kemudian).
 */

export const ulid = (name = "id") =>
  text(name)
    .primaryKey()
    .notNull()
    .default(sql`gen_ulid()`);

export const ulidRef = (name: string) => text(name).notNull();

export const withTimestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
};

export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
};

export function jsonbT<T = unknown>(name: string) {
  return jsonb(name).$type<T>();
}

/**
 * PostgreSQL DDL bootstrap — dijalankan paling awal sebelum migration apapun
 * oleh `db/migrate.ts`. JANGAN edit di sini; tambah di db/migrate.ts kalau perlu.
 */
export const BOOTSTRAP_SQL = `
-- Extensions
-- NOTE: Neon serverless Postgres support pgcrypto + pgvector tapi TIDAK support timescaledb.
-- Untuk MVP, time-series table pakai regular indexed tables + native partitioning kalau perlu.
-- Migrate ke QuestDB / ClickHouse di M9+ kalau scale memaksa.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ULID generator (Crockford's base32, time-sortable, 26 char)
CREATE OR REPLACE FUNCTION gen_ulid() RETURNS text AS $$
DECLARE
  encoding   bytea = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  output     text = '';
  unix_time  bigint;
  ulid_bytes bytea;
BEGIN
  unix_time = (extract(epoch from clock_timestamp()) * 1000)::bigint;
  -- 6-byte big-endian time (48 bits) + 10-byte random = EXACTLY 16 bytes.
  -- (Sebelumnya bug: append random ke 16-byte zero buffer → bytes 6-15 selalu 0
  --  → ULID suffix selalu 0 → PK collision.)
  ulid_bytes = decode(lpad(to_hex(unix_time), 12, '0'), 'hex') || gen_random_bytes(10);

  -- Crockford base32 encode (8 byte time + 8 byte random parts)
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 0) & 224) >> 5));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 0) & 31)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 1) & 248) >> 3));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 1) & 7) << 2) | ((get_byte(ulid_bytes, 2) & 192) >> 6)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 2) & 62) >> 1));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 2) & 1) << 4) | ((get_byte(ulid_bytes, 3) & 240) >> 4)));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 3) & 15) << 1) | ((get_byte(ulid_bytes, 4) & 128) >> 7)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 4) & 124) >> 2));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 4) & 3) << 3) | ((get_byte(ulid_bytes, 5) & 224) >> 5)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 5) & 31)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 6) & 248) >> 3));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 6) & 7) << 2) | ((get_byte(ulid_bytes, 7) & 192) >> 6)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 7) & 62) >> 1));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 7) & 1) << 4) | ((get_byte(ulid_bytes, 8) & 240) >> 4)));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 8) & 15) << 1) | ((get_byte(ulid_bytes, 9) & 128) >> 7)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 9) & 124) >> 2));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 9) & 3) << 3) | ((get_byte(ulid_bytes, 10) & 224) >> 5)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 10) & 31)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 11) & 248) >> 3));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 11) & 7) << 2) | ((get_byte(ulid_bytes, 12) & 192) >> 6)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 12) & 62) >> 1));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 12) & 1) << 4) | ((get_byte(ulid_bytes, 13) & 240) >> 4)));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 13) & 15) << 1) | ((get_byte(ulid_bytes, 14) & 128) >> 7)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 14) & 124) >> 2));
  output = output || chr(get_byte(encoding, ((get_byte(ulid_bytes, 14) & 3) << 3) | ((get_byte(ulid_bytes, 15) & 224) >> 5)));
  output = output || chr(get_byte(encoding, (get_byte(ulid_bytes, 15) & 31)));
  RETURN output;
END
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger function untuk updated_at otomatis
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
`;
