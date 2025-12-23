import { http } from "@/utils/http";

export type HazardLevel = "minor" | "major";
export type HazardStatus = "to_fix" | "fixing" | "to_review" | "closed";

export type Hazard = {
  id: number;
  task: number;
  task_item_record: number | null;
  title: string;
  description: string;
  level: HazardLevel;
  area: number;
  department: string | null;
  responsible: number | null;
  responsible_name?: string | null;
  responsible_full_name?: string | null;
  due_date: string | null;
  status: HazardStatus;
  created_at: string;
  updated_at: string;
};

export type HazardListParams = Partial<{
  status: HazardStatus;
  level: HazardLevel;
  area: number;
  responsible: number;
  keyword: string;
  page: number;
  page_size: number;
  department: string;
  task: number;
  due_from: string;
  due_to: string;
}>;

export type HazardListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Hazard[];
};

export function getHazards(params?: HazardListParams) {
  return http.get<Hazard[] | HazardListResponse, HazardListParams>(
    "/hazards/",
    {
      params
    }
  );
}

export function transitionHazardStatus(
  id: number,
  status: "to_review" | "closed"
) {
  return http.post<Hazard, any>(`/hazards/${id}/transition-status/`, {
    data: { status }
  });
}
