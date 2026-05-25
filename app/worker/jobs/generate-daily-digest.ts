import type { Processor } from "bullmq";
import { generateDailyDigest } from "@/lib/daily-digest/generator";
import { logger } from "@/lib/logger";

export const generateDailyDigestProcessor: Processor = async () => {
  const result = await generateDailyDigest();
  logger.info({ result }, "Daily digest job complete");
  return result;
};
