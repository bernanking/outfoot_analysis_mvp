import { z } from "zod";

export const concernTypeSchema = z.enum(["NAIL", "PAIN_INSOLE"]);
export type ConcernType = z.infer<typeof concernTypeSchema>;

export const consultationStatusSchema = z.enum([
  "INTAKE",
  "QUESTIONNAIRE",
  "IN_VISIT",
  "ANALYSIS_REVIEW",
  "FINALIZED",
]);
export type ConsultationStatus = z.infer<typeof consultationStatusSchema>;

// 서버 골격의 상태 확인 응답입니다. DB·인증·파일 연결은 후속 작업(T02·T03·T09) 전까지 NOT_CONNECTED로만 표시하며,
// 실제 연결 성공처럼 보이는 값을 만들지 않습니다. AI는 mock 또는 비활성만 허용합니다(O06·O07 전 실제 전송 금지).
export const integrationStateSchema = z.enum(["NOT_CONNECTED"]);
export const aiModeSchema = z.enum(["mock", "disabled"]);
export type AiMode = z.infer<typeof aiModeSchema>;
export const apiRuntimeSchema = z.enum(["supabase-edge", "test"]);
export type ApiRuntime = z.infer<typeof apiRuntimeSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("outfoot-api"),
  runtime: apiRuntimeSchema,
  integrations: z.object({
    database: integrationStateSchema,
    auth: integrationStateSchema,
    storage: integrationStateSchema,
    ai: aiModeSchema,
  }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// 오류 응답 형식입니다. message는 사용자에게 보여줄 수 있는 문장만 담고, 개인정보·비밀값·내부 원인은 넣지 않습니다.
export const apiErrorCodeSchema = z.enum(["NOT_FOUND", "METHOD_NOT_ALLOWED", "ORIGIN_NOT_ALLOWED", "CONFIG_INVALID", "INTERNAL_ERROR"]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

// 성공 응답은 { data } 형식입니다(docs/10_API_CONTRACT.md).
export const dataEnvelope = <T extends z.ZodType>(schema: T) => z.object({ data: schema });
