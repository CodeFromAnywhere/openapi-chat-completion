import { ipAddress } from "@vercel/functions";
import { Redis } from "@upstash/redis";

/**
TODO: The completions endpoint should just care about calculating the cost

The FREE limit should be imposed by every service independently. This gives me freedom to play with each freemium model.
*/
const middleware = async (request: Request) => {
  const Authorization = request.headers.get("Authorization");
  const ip = ipAddress(request) || "127.0.0.1";
  const isFreePlan = true;
  // TODO: Use auth to validate authorization first
  const isAuthorized = !!Authorization;
  const ratelimitUserId = isAuthorized ? "sjdkfjslsdjkfsjl" : ip;

  const redis = Redis.fromEnv();

  const [day, hour] = await redis.mget<number[]>(
    `ratelimit.${ratelimitUserId}.day`,
    `ratelimit.${ratelimitUserId}.hour`,
  );

  const dayLimit = isAuthorized ? 1 : 0.1;
  const hourLimit = isAuthorized ? 0.5 : 0.1;

  if (day > dayLimit) {
    return new Response("Daily ratelimit reached", { status: 429 });
  }

  if (hour > hourLimit) {
    return new Response("Hourly ratelimit reached", {
      status: 429,
      //implement this 429 + ratelmit headers: https://console.groq.com/docs/rate-limits#status-code--rate-limit-headers
      //   headers: {
      //     "retry-after": "2",
      //     //Always refers to Requests Per Day (RPD)
      //     "x-ratelimit-limit-requests": "14400",
      //     //Always refers to Tokens Per Hour (TPM)
      //     "x-ratelimit-limit-tokens": "18000",
      //     //Always refers to Requests Per Day (RPD)
      //     "x-ratelimit-remaining-requests": "14370",
      //     //Always refers to Tokens Per Minute (TPM)
      //     "x-ratelimit-remaining-tokens": "17997",
      //     //Always refers to Requests Per Day (RPD)
      //     "x-ratelimit-reset-requests": "2m59.56s",
      //     //Always refers to Tokens Per Minute (TPM)
      //     "x-ratelimit-reset-tokens": "7.66s",
      //   },
    });
  }
};
