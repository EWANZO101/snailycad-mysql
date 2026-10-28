import { Controller } from "@tsed/di";
import { Req } from "@tsed/common";
import { ContentType, Description, Post, Tags } from "@tsed/schema";
import { NotFound, TooManyRequests, Unauthorized } from "@tsed/exceptions";
import { Feature } from "@prisma/client";
import { prisma } from "lib/data/prisma";
import { erlcService } from "lib/erlc/erlc-service";
import { verifyErlcSignature } from "lib/erlc/webhook-signature";

/**
 * public webhook for ER:LC event webhooks (private server Settings > Event Webhook). No session:
 * every request is signed by ER:LC with Ed25519 over `X-Signature-Timestamp + raw body`.
 *
 * The payloads aren't documented beyond "commands starting with ; and emergency calls", so a
 * valid event only makes the CAD poll right away; the poll creates the calls (and dedupes them).
 */

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_IP = 120;
const MAX_FAILURES_PER_IP = 20;

interface Bucket {
  windowStart: number;
  requests: number;
  failures: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(ip: string) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { windowStart: now, requests: 0, failures: 0 };
    buckets.set(ip, bucket);
  }

  // keep the map from growing forever
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (now - value.windowStart > WINDOW_MS) buckets.delete(key);
    }
  }
  return bucket;
}

function header(req: Req, name: string) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

@Tags("Integrations")
@Controller("/integrations/erlc")
@ContentType("application/json")
export class ErlcWebhookController {
  @Post("/webhook")
  @Description("Receives ER:LC event webhooks (Ed25519-signed by ER:LC)")
  async webhook(@Req() req: Req) {
    // not trusting `x-forwarded-for` (spoofable); behind a proxy everyone shares one bucket
    const bucket = getBucket(String(req.ip || req.socket?.remoteAddress || "unknown"));
    bucket.requests += 1;
    if (bucket.requests > MAX_REQUESTS_PER_IP || bucket.failures >= MAX_FAILURES_PER_IP) {
      throw new TooManyRequests("Too many requests");
    }

    const [settings, feature] = await Promise.all([
      prisma.erlcSettings.findFirst(),
      prisma.cadFeature.findFirst({ where: { feature: Feature.ERLC } }),
    ]);
    if (!settings?.enabled || !feature?.isEnabled) {
      throw new NotFound("Not Found");
    }

    const isValid = verifyErlcSignature({
      timestamp: header(req, "x-signature-timestamp"),
      signatureHex: header(req, "x-signature-ed25519"),
      // an empty body never reaches the JSON parser
      rawBody: (req as Req & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0),
    });
    if (!isValid) {
      bucket.failures += 1;
      throw new Unauthorized("Invalid signature");
    }

    erlcService.trigger();
    return { ok: true };
  }
}
