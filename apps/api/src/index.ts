import {
  demoConsultations,
  demoConsultationListSchema,
  healthResponseSchema,
} from "@outfoot/contracts";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init.headers,
    },
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/v1/health") {
      return json(
        healthResponseSchema.parse({
          ok: true,
          service: "outfoot-api",
          dataMode: "synthetic",
        }),
      );
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/v1/demo/consultations"
    ) {
      return json(demoConsultationListSchema.parse(demoConsultations));
    }

    if (url.pathname.startsWith("/api/")) {
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "요청한 API를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
