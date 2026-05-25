import { getAuth } from "@/lib/auth/server";

/**
 * Better-Auth catch-all handler. Instance dibangun lazy karena bergantung pada
 * `app_config` (session duration, OAuth creds, dll) — kita resolve per request,
 * lalu delegate ke `auth.handler`. Better-Auth core `handler` menerima `Request`
 * standard dan return `Response` Web Fetch — kompatibel langsung dengan Next.js
 * Route Handlers.
 */
async function handler(req: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(req);
}

export { handler as GET, handler as POST };
