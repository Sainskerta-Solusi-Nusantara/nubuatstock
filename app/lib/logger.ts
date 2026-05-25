import pino from "pino";
import { env } from "./env";

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? "debug" : "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "apiKey",
      "*.apiKey",
      "authorization",
      "headers.authorization",
      "headers.cookie",
      "encryptedValue",
      "*.encryptedValue",
      "secret",
      "*.secret",
      "anthropicApiKey",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
        },
      }
    : {}),
});

export type Logger = typeof logger;
