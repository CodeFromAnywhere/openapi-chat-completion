import { ipAddress } from "@vercel/functions";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const config = {
  matcher: [
    "/:model/chat/completions",
    "/:model/chat/simple",
    "/:model/chat/get",
  ],
};

const middleware = async (request: Request) => {
  if (
    request.method === "GET" &&
    new URL(request.url).pathname.endsWith("/completions")
  ) {
    // Requesting an openapi does not count towards the ratelimit
    return;
  }

  const Authorization = request.headers.get("Authorization");
  const userId = request.headers.get("X-USER-ID");
  const ip = ipAddress(request) || "127.0.0.1";
  const isFreePlan = true;
  const isAdmin =
    !!process.env.ADMIN_SECRET && Authorization === process.env.ADMIN_SECRET;

  // TODO: Add oauth2 and allow for
  const ratelimitUserId = isAdmin ? userId : ip;

  const redis = Redis.fromEnv();

  const requestsLimit = 100;
  const adminLimit = 10000;
  const limitAmount = ratelimitUserId ? requestsLimit : adminLimit;

  const { limit } = new Ratelimit({
    redis,
    analytics: true,
    timeout: 10000,
    limiter: Ratelimit.slidingWindow(limitAmount, `6h`),
  });

  console.log("HIT RATELIMIT MIDDLEWARE", {
    isAdmin,
    limitAmount,
    ratelimitUserId,
  });

  const info = await limit(ratelimitUserId || "admin");

  if (!info.success) {
    return new Response(
      `Ratelimit reached. The maximum amount of requests is currently set to ${requestsLimit} per 6 hours.`,
      {
        status: 429,
        headers: {
          //Always refers to Requests Per 6h
          "x-ratelimit-limit-requests": "100",
          //Always refers to Requests Per 6h
          "x-ratelimit-remaining-requests": String(
            requestsLimit - info.remaining,
          ),
          //Always refers to Requests Per 6h
          // string in seconds
          "x-ratelimit-reset-requests": String(
            (info.reset - Date.now()) / 1000,
          ),

          //implement this 429 + ratelmit headers: https://console.groq.com/docs/rate-limits#status-code--rate-limit-headers
          //Always refers to Tokens Per Hour (TPM)
          // "x-ratelimit-limit-tokens": "18000",
          //Always refers to Tokens Per Minute (TPM)
          // "x-ratelimit-remaining-tokens": "17997",
          //Always refers to Tokens Per Minute (TPM)
          // "x-ratelimit-reset-tokens": "7.66s",
        },
      },
    );
  }
};
export default middleware;
