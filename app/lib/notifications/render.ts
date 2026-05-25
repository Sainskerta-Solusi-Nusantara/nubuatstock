import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { notificationTemplates } from "@/db/schema/notifications";
import type {
  NotificationChannel,
  NotificationTemplate,
  NotificationVariableSpec,
} from "@/lib/types/notifications";

/**
 * Template renderer untuk notifikasi.
 *
 * - `renderTemplate({ key, channel, locale, variables })` query template aktif
 *   (highest version, is_active=true) lalu substitute `{{var}}`.
 * - HTML body di-escape kalau `is_html=true` & variable berisi karakter risky.
 * - Required variables (dari `template.variables` JSON spec) divalidasi strict.
 *
 * Catatan: locale fallback — kalau target locale tidak ada, coba "id-ID".
 */

const VARIABLE_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

export interface RenderTemplateInput {
  key: string;
  channel: NotificationChannel;
  locale?: string;
  variables: Record<string, unknown>;
}

export interface RenderedTemplate {
  subject: string | null;
  body: string;
  template: NotificationTemplate;
}

export async function renderTemplate(
  input: RenderTemplateInput,
): Promise<RenderedTemplate> {
  const locale = input.locale ?? "id-ID";
  const tpl = await loadActiveTemplate({
    key: input.key,
    channel: input.channel,
    locale,
  });

  if (!tpl) {
    throw new NotFoundError(
      `notification_template ${input.key}/${input.channel}/${locale}`,
    );
  }

  const requiredVars = Object.entries(tpl.variables ?? {})
    .filter(([, spec]) => (spec as NotificationVariableSpec).required)
    .map(([name]) => name);

  const opts = { isHtml: tpl.isHtml, requiredVars };
  return {
    subject: tpl.subject ? applyTemplate(tpl.subject, input.variables, opts) : null,
    body: applyTemplate(tpl.body, input.variables, opts),
    template: tpl,
  };
}

async function loadActiveTemplate(params: {
  key: string;
  channel: NotificationChannel;
  locale: string;
}): Promise<NotificationTemplate | null> {
  const tryLocales = [params.locale, "id-ID"].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );

  for (const loc of tryLocales) {
    const rows = await db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.key, params.key),
          eq(notificationTemplates.channel, params.channel),
          eq(notificationTemplates.locale, loc),
          eq(notificationTemplates.isActive, true),
        ),
      )
      .orderBy(desc(notificationTemplates.version))
      .limit(1);
    if (rows.length > 0) return rows[0] ?? null;
  }

  return null;
}

// =================== Pure substitution (exported for unit test) ===================

export interface ApplyTemplateOptions {
  isHtml: boolean;
  requiredVars?: string[];
}

export function applyTemplate(
  template: string,
  variables: Record<string, unknown>,
  opts: ApplyTemplateOptions,
): string {
  if (opts.requiredVars && opts.requiredVars.length > 0) {
    for (const name of opts.requiredVars) {
      if (!(name in variables) || variables[name] === undefined || variables[name] === null) {
        throw new ValidationError(
          `Missing required notification variable: ${name}`,
          { variable: name },
        );
      }
    }
  }

  return template.replace(VARIABLE_REGEX, (_match, rawName: string) => {
    const value = variables[rawName];
    if (value === undefined || value === null) {
      logger.debug({ name: rawName }, "Template var unresolved → empty string");
      return "";
    }
    const str = String(value);
    return opts.isHtml ? escapeHtml(str) : str;
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
