import { and, eq } from "drizzle-orm";
import { initAuthCreds, BufferJSON, proto } from "@whiskeysockets/baileys";
import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { db } from "@/lib/db";
import { waAuthState } from "@/db/schema/wa-auth";

/**
 * Auth-state Baileys yang dipersist ke Postgres (tabel `wa_auth_state`).
 *
 * Pengganti `useMultiFileAuthState` (yang nulis ke disk) supaya sesi WA bot
 * bertahan lintas restart/host. Serialisasi pakai `BufferJSON` agar Buffer
 * (keys kripto) aman jadi JSON/jsonb. Satu row per key, di-namespace `account`.
 *
 * DORMANT sampai nomor di-pair (scripts/wa-login.ts) & listener jalan.
 */

async function readData<T = unknown>(account: string, key: string): Promise<T | null> {
  const rows = await db
    .select({ data: waAuthState.data })
    .from(waAuthState)
    .where(and(eq(waAuthState.account, account), eq(waAuthState.key, key)))
    .limit(1);
  if (rows.length === 0) return null;
  // jsonb sudah jadi object; round-trip lewat reviver utk rekonstruksi Buffer.
  return JSON.parse(JSON.stringify(rows[0]!.data), BufferJSON.reviver) as T;
}

async function writeData(account: string, key: string, data: unknown): Promise<void> {
  const value = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
  await db
    .insert(waAuthState)
    .values({ account, key, data: value })
    .onConflictDoUpdate({
      target: [waAuthState.account, waAuthState.key],
      set: { data: value, updatedAt: new Date() },
    });
}

async function removeData(account: string, key: string): Promise<void> {
  await db
    .delete(waAuthState)
    .where(and(eq(waAuthState.account, account), eq(waAuthState.key, key)));
}

export async function useDbAuthState(
  account = "mirae",
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const creds: AuthenticationCreds = (await readData<AuthenticationCreds>(account, "creds")) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(account, `${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
              }
              result[id] = value as SignalDataTypeMap[typeof type];
            }),
          );
          return result;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const type in data) {
            const cat = (data as Record<string, Record<string, unknown>>)[type]!;
            for (const id in cat) {
              const value = cat[id];
              const key = `${type}-${id}`;
              tasks.push(value ? writeData(account, key, value) : removeData(account, key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(account, "creds", creds);
    },
  };
}
