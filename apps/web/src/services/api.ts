import {
  demoConsultationListSchema,
  healthResponseSchema,
  type DemoConsultation,
  type HealthResponse,
} from "@outfoot/contracts";

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패 (${response.status})`);
  }

  return response.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return healthResponseSchema.parse(await getJson("/api/v1/health"));
}

export async function getDemoConsultations(): Promise<DemoConsultation[]> {
  const response = await getJson("/api/v1/demo/consultations");
  return demoConsultationListSchema.parse(response);
}
