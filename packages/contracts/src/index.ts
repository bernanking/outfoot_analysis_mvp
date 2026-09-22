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

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("outfoot-api"),
  dataMode: z.literal("synthetic"),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const demoConsultationSchema = z.object({
  id: z.string().min(1),
  patientLabel: z.string().min(1),
  concernTypes: z.array(concernTypeSchema).min(1),
  concernLabel: z.string().min(1),
  status: consultationStatusSchema,
  statusLabel: z.string().min(1),
  synthetic: z.literal(true),
});
export type DemoConsultation = z.infer<typeof demoConsultationSchema>;

export const demoConsultationListSchema = z.array(demoConsultationSchema);

export const demoConsultations = demoConsultationListSchema.parse([
  {
    id: "demo-consultation-001",
    patientLabel: "합성 환자 A",
    concernTypes: ["NAIL"],
    concernLabel: "발톱 상담",
    status: "QUESTIONNAIRE",
    statusLabel: "사전질문 작성 중",
    synthetic: true,
  },
  {
    id: "demo-consultation-002",
    patientLabel: "합성 환자 B",
    concernTypes: ["PAIN_INSOLE"],
    concernLabel: "통증·인솔 상담",
    status: "IN_VISIT",
    statusLabel: "상담 중",
    synthetic: true,
  },
  {
    id: "demo-consultation-003",
    patientLabel: "합성 환자 C",
    concernTypes: ["NAIL", "PAIN_INSOLE"],
    concernLabel: "발톱 + 통증·인솔 상담",
    status: "ANALYSIS_REVIEW",
    statusLabel: "분석 검토",
    synthetic: true,
  },
]);
