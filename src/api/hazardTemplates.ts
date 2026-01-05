import { http } from "@/utils/http";

export type HazardReportTemplate = {
  id: number;
  name: string;
  description?: string | null;
  is_default: boolean;
  page_size?: "A4" | "A5" | null;
  created_at: string;
  updated_at: string;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function unwrapPaginated<T>(data: T[] | PaginatedResponse<T>) {
  return Array.isArray(data) ? data : data.results;
}

export function getHazardReportTemplates() {
  return http
    .get<
      HazardReportTemplate[] | PaginatedResponse<HazardReportTemplate>,
      any
    >("/hazard-report-templates/", { params: { page_size: 100 } })
    .then(unwrapPaginated);
}

export function createHazardReportTemplate(payload: {
  name: string;
  description?: string | null;
  is_default?: boolean;
  page_size?: "A4" | "A5" | null;
}) {
  return http.post<HazardReportTemplate, any>("/hazard-report-templates/", {
    data: payload
  });
}

export function updateHazardReportTemplate(
  id: number,
  payload: Partial<{
    name: string;
    description?: string | null;
    is_default?: boolean;
    page_size?: "A4" | "A5" | null;
  }>
) {
  return http.request<HazardReportTemplate>(
    "patch",
    `/hazard-report-templates/${id}/`,
    { data: payload }
  );
}
