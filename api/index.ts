import { jsonGetter } from "edge-util";
import { calculateCost } from "./chat/calculate-cost.js";
import { raw } from "./chat/raw.js";
import {
  getSimpleResponseGetRequest,
  getSimpleResponsePostRequest,
} from "./chat/simple.js";
import { completions } from "./chat/completions.js";
import { fetchOpenapi } from "./chat/util.js";

export const config = { runtime: "edge", regions: ["iad1"] };

export const OPTIONS = async (request: Request) => {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-OPENAPI-SECRET, X-BASEPATH",
  };
  // Handle OPTIONS request (preflight)
  return new Response(null, { headers });
};

/**
 * Expose the OpenAPI at root, only changing the server and path so it's used right.
 */
export const GET = async (request: Request) => {
  const url = new URL(request.url);

  // the first part can contain the openapiUrl, but if it's just 'chat', we omit openapiUrl
  const [id, ...rest] = url.pathname.slice(1).split("/");
  const path = id === "chat" ? "chat/" + rest.join("/") : rest.join("/");
  const openapiUrl = id === "chat" ? null : decodeURIComponent(id);
  //   console.log({ path, openapiUrl });
  const accept = request.headers.get("Accept");

  if (accept?.startsWith("text/html") && path !== "openapi.json") {
    const page = "/index.html";
    // default for browsers, ensuring we get html for browsers, openapi otherwise
    const template = await fetch(new URL(request.url).origin + page).then(
      (res) => res.text(),
    );
    const data = { openapiUrl, path };
    const html = template.replaceAll(
      "const data = {}",
      `const data = ${JSON.stringify(data)}`,
    );
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        // "Cache-Control": "max-age=60, s-maxage=60",
      },
    });
  }

  // All get requests

  if (path === "chat/calculate-cost") {
    return jsonGetter(calculateCost)(request);
  }
  if (path === "chat/raw") {
    return raw(request);
  }

  if (path === "chat/simple") {
    return getSimpleResponseGetRequest(request);
  }

  if (path !== "" && path !== "openapi.json") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (openapiUrl && !(await fetchOpenapi(openapiUrl))) {
    return new Response("Given OpenAPI not found", { status: 404 });
  }

  const originUrl = new URL(request.url).origin;
  const agentOpenapi = await fetch(originUrl + `/openapi.json`).then((res) =>
    res.json(),
  );

  agentOpenapi.servers[0].url =
    originUrl + (openapiUrl ? `/` + encodeURIComponent(openapiUrl) : "");

  return new Response(JSON.stringify(agentOpenapi, undefined, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST = (request: Request) => {
  const url = new URL(request.url);

  // the first part can contain the openapiUrl, but if it's just 'chat', we omit openapiUrl
  const [id, ...rest] = url.pathname.slice(1).split("/");
  const path = id === "chat" ? "chat/" + rest.join("/") : rest.join("/");
  const openapiUrl = id === "chat" ? null : decodeURIComponent(id);

  if (path === "chat/completions") {
    return completions(request);
  }

  if (path === "chat/simple") {
    return getSimpleResponsePostRequest(request);
  }

  return new Response("Method not allowed", { status: 405 });
};
