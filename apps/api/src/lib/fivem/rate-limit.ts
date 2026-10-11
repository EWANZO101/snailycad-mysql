import { TooManyRequests } from "@tsed/exceptions";

/**
 * Rate limits for the FiveM integration endpoints, per IP address. A game server sends a request
 * per character load, duty change and resync, so the request limit is generous; wrong tokens are
 * limited much harder.
 */
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 600;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_WINDOW = 20;

interface Bucket {
  windowStart: number;
  requests: number;
  failureWindowStart: number;
  failures: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(ip: string) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { windowStart: now, requests: 0, failureWindowStart: now, failures: 0 };
    buckets.set(ip, bucket);
  }
  if (now - bucket.windowStart > WINDOW_MS) {
    bucket.windowStart = now;
    bucket.requests = 0;
  }
  if (now - bucket.failureWindowStart > FAILURE_WINDOW_MS) {
    bucket.failureWindowStart = now;
    bucket.failures = 0;
  }
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (now - value.windowStart > FAILURE_WINDOW_MS) buckets.delete(key);
    }
  }
  return bucket;
}

/** counts a request; throws 429 when this address sends too many or failed too often */
export function hitFivemRateLimit(ip: string) {
  const bucket = getBucket(ip);
  if (bucket.failures >= MAX_FAILURES_PER_WINDOW) throw new TooManyRequests("tooManyFailures");
  bucket.requests += 1;
  if (bucket.requests > MAX_REQUESTS_PER_WINDOW) throw new TooManyRequests("tooManyRequests");
}

/** counts a failed token check */
export function recordFivemFailure(ip: string) {
  getBucket(ip).failures += 1;
}
